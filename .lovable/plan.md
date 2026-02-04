

# Fix Feature Visibility When Switching Between Modes

## Problem Summary

Features disappear when navigating back to the Track Editor from other views (Fan, Media, Ops). The issue is a **timing and state synchronization problem** between two feature renderers that share the same map but manage layers independently.

---

## Root Cause Analysis

There are two feature renderers in the system:

| Renderer | Location | Purpose |
|----------|----------|---------|
| `useSharedFeatureRenderer` | `SharedMapContainer` (always mounted) | Read-only display in Fan/Media/Ops views |
| `useFeatureRenderer` | `TrackEditor` (mounts/unmounts) | Interactive editing in Editor view |

### The Bug Sequence

1. **In Editor**: Editor renderer creates layers (`feature-*`), shared renderer hides its layers (`shared-*`)
2. **Leave Editor**: Editor unmounts, sets `sourceAddedRef = false`, hides its layers
3. **In Fan/Ops/Media**: Shared renderer shows its layers correctly
4. **Return to Editor**: 
   - `useFeatureRenderer` mounts with `sourceAddedRef = false`
   - The data update effect runs and **early-returns** because `sourceAddedRef.current` is `false`
   - `setupLayers` finds source already exists, sets `sourceAddedRef = true`
   - But the data update effect **already ran** and won't re-run until features change
   - **Result**: Editor layers are visible but empty!

The same issue affects the shared renderer's visibility toggle - it depends on `sourceAddedRef.current` being `true`.

---

## Solution

### Fix 1: Ensure layers are visible AND data is updated on mount

In both renderers, after setting `sourceAddedRef.current = true`, immediately update the source data.

### Fix 2: Don't rely on ref state between effect dependencies

Move the data update INTO `setupLayers` to guarantee it runs after source is ready.

### Fix 3: Shared renderer should NOT remove layers on cleanup

Since `SharedMapContainer` never unmounts during normal navigation, the cleanup removing layers is unnecessary and could cause issues if it ever did run.

---

## Files to Modify

### `src/hooks/useFeatureRenderer.ts`

| Change | Description |
|--------|-------------|
| Update data in `setupLayers` | After ensuring layers exist and are visible, immediately set the source data |
| Add features to effect dependency | Ensure `setupLayers` re-runs when features change (or update data separately) |

### `src/hooks/useSharedFeatureRenderer.ts`

| Change | Description |
|--------|-------------|
| Update data in `setupLayers` | After source is confirmed ready, set the data |
| Remove layer deletion on cleanup | Just hide layers instead of removing them (like editor does) |
| Move visibility toggle into setup | Ensure visibility is set when layers are confirmed to exist |

---

## Detailed Changes

### `useFeatureRenderer.ts` Changes

```javascript
// In setupLayers, after setting sourceAddedRef.current = true:

// Immediately update the source data since we're now ready
const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
if (source) {
  const renderableFeatures = features.filter(f => 
    f.id !== editingGeometryFeatureId && !hiddenFeatureIds.has(f.id)
  );
  source.setData(toGeoJSON(renderableFeatures));
}
```

Also add `features`, `editingGeometryFeatureId`, `hiddenFeatureIds` to the effect dependencies so it re-runs when features change.

### `useSharedFeatureRenderer.ts` Changes

1. **Update data in setupLayers**:
```javascript
// After sourceAddedRef.current = true:
const source = map.getSource(SHARED_SOURCE_ID) as mapboxgl.GeoJSONSource;
if (source) {
  source.setData(toGeoJSON(features));
}

// Also set visibility immediately
const visibility = currentMode === 'editor' ? 'none' : 'visible';
layers.forEach(layerId => {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visibility);
  }
});
```

2. **Don't remove layers on cleanup** - just hide them (matching the editor renderer pattern)

---

## Result

After these changes:
1. Features will appear correctly when returning to the Track Editor
2. Features will show/hide correctly when switching between Fan/Media/Ops views
3. Both renderers will be synchronized with the shared map state
4. No more timing race conditions between setup and data update effects

