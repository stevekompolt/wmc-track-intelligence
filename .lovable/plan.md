

# Fix Feature Disappearing on Click and Geometry Editing

## Problem Summary

Two related bugs are causing features to disappear:

1. **Feature disappears on click** - Clicking a feature to select it makes it vanish
2. **Feature disappears when starting geometry editing** - The feature vanishes immediately when entering edit mode

## Root Cause Analysis

### Issue 1: Stale Closure in setupLayers

In `useFeatureRenderer.ts`, the `setupLayers` function (lines 135-279) captures `features`, `editingGeometryFeatureId`, and `hiddenFeatureIds` in its closure when the effect runs. However, these values were removed from the effect dependencies in the last fix, which means:

- The initialization effect runs once with `[map, toGeoJSON]` as dependencies
- `setupLayers` is defined with the **initial values** of `features`, `editingGeometryFeatureId`, and `hiddenFeatureIds`
- When `style.load` event fires or the effect re-runs, `setupLayers` uses **stale values**
- This can cause the source to be updated with outdated data, filtering out features incorrectly

### Issue 2: Geometry Editing Layer Race Condition

When geometry editing starts:

1. `editingGeometryFeatureId` is set in TrackEditor
2. The data-update effect in `useFeatureRenderer` runs and filters out that feature
3. `useFeatureGeometryEditor` should create preview layers to show the feature
4. **BUT**: The geometry editor's effect has `feature?.id` in its dependencies, and when the feature reference changes (which happens on every update), it runs cleanup (`removeEditingLayers`) then tries to recreate
5. The `createLayersAndMarkers` function checks `editingLayersAddedRef.current` to avoid duplicate creation, but after cleanup it's set to `false`
6. If `map.isStyleLoaded()` returns false during this transition, the layers never get created

### Issue 3: toGeoJSON Dependency on selectedFeatureId

The `toGeoJSON` callback depends on `selectedFeatureId` (line 61). When a feature is clicked:

1. `onFeatureClick` triggers `selectFeature(featureId)`
2. `selectedFeatureId` changes in FeatureContext
3. `toGeoJSON` is recreated (new callback reference)
4. The initialization effect (which depends on `toGeoJSON`) runs its cleanup
5. Cleanup hides all layers with `visibility: 'none'`
6. The effect then re-runs `setupLayers` which shows them again
7. This causes a **flicker** and if there's a timing issue, the feature may stay hidden

## Solution

### Fix 1: Use Refs for Mutable State in setupLayers

Store `features`, `editingGeometryFeatureId`, and `hiddenFeatureIds` in refs so `setupLayers` always accesses current values without being in the dependency array.

### Fix 2: Remove selectedFeatureId from toGeoJSON Dependencies

The `selected` property can be computed during render using a ref, preventing the callback from being recreated on every selection change.

### Fix 3: Keep Feature Visible During Geometry Editing

Instead of filtering out `editingGeometryFeatureId` from the main renderer, keep it visible and let the geometry editor add vertex markers **on top**. This ensures no gap where the feature is invisible.

Alternatively, ensure the geometry editor creates its preview layers **before** the main renderer hides the feature by coordinating the timing.

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useFeatureRenderer.ts` | Use refs for mutable values; stabilize toGeoJSON; don't hide feature being edited from main source |
| `src/hooks/useFeatureGeometryEditor.ts` | Improve layer creation timing; don't rely on effect cleanup/recreation cycle |

## Technical Changes

### `useFeatureRenderer.ts`

**Add refs for mutable values:**

```typescript
const featuresRef = useRef(features);
const editingGeometryFeatureIdRef = useRef(editingGeometryFeatureId);
const hiddenFeatureIdsRef = useRef(hiddenFeatureIds);
const selectedFeatureIdRef = useRef(selectedFeatureId);

// Keep refs updated
useEffect(() => {
  featuresRef.current = features;
  editingGeometryFeatureIdRef.current = editingGeometryFeatureId;
  hiddenFeatureIdsRef.current = hiddenFeatureIds;
  selectedFeatureIdRef.current = selectedFeatureId;
});
```

**Stabilize toGeoJSON:**

Remove `selectedFeatureId` from the dependency array and use the ref instead:

```typescript
const toGeoJSON = useCallback((featureList: VenueFeature[]): GeoJSON.FeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: featureList.map(f => ({
      // ...
      selected: f.id === selectedFeatureIdRef.current,
      // ...
    })),
  };
}, []); // No dependencies - uses ref
```

**Update setupLayers to use refs:**

```typescript
const setupLayers = () => {
  // ... layer creation code ...
  
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (source) {
    // DON'T filter out editingGeometryFeatureId - let it stay visible
    // The geometry editor adds markers on top, not replacing the feature
    const renderableFeatures = featuresRef.current.filter(f => 
      !hiddenFeatureIdsRef.current.has(f.id)
    );
    source.setData(toGeoJSON(renderableFeatures));
  }
};
```

**Update data effect similarly:**

```typescript
useEffect(() => {
  if (!map || !sourceAddedRef.current) return;

  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (source) {
    // Keep editingGeometryFeatureId visible - geometry editor adds markers on top
    const renderableFeatures = features.filter(f => 
      !hiddenFeatureIds.has(f.id)
    );
    source.setData(toGeoJSON(renderableFeatures));
  }
}, [map, features, toGeoJSON, hiddenFeatureIds]);
// NOTE: editingGeometryFeatureId removed from deps AND from filter
```

### `useFeatureGeometryEditor.ts`

**Don't clean up layers when feature reference changes:**

The current effect runs cleanup when `feature?.id` changes OR when `isEditing` changes. But it also re-runs when the `feature` object reference changes (even with same ID).

Fix by checking if we actually need to recreate layers:

```typescript
useEffect(() => {
  if (!isEditing || !map || !feature) {
    // Only cleanup when truly stopping editing
    if (!isEditing || !feature) {
      clearMarkers();
      removeEditingLayers();
      currentFeatureIdRef.current = null;
    }
    return;
  }

  // Only do full cleanup and recreation when feature ID changes
  const featureChanged = currentFeatureIdRef.current !== feature.id;
  
  if (featureChanged) {
    currentFeatureIdRef.current = feature.id;
    clearMarkers();
    removeEditingLayers();
    
    // Create new layers and markers
    const createLayersAndMarkers = () => { /* ... */ };
    
    if (map.isStyleLoaded()) {
      createLayersAndMarkers();
    } else {
      map.once('style.load', createLayersAndMarkers);
    }
  }
  
  // No cleanup function - layers persist until explicitly removed
}, [isEditing, map, feature?.id]);
```

## Result

After these changes:

1. Clicking a feature will select it without any flicker or disappearance
2. Starting geometry editing will keep the feature visible with vertex markers overlaid
3. The eye icon visibility toggle will work smoothly without affecting unrelated features
4. Switching between modes will preserve feature visibility correctly

