
# Fix Feature Visibility Toggle Bug and Add Inspector Toggle

## Problem Summary

Two issues need to be fixed:

1. **Bug**: When clicking the eye icon to toggle feature visibility, the entire setup effect re-runs because `hiddenFeatureIds` is in its dependency array. This causes layers to be hidden and re-shown, creating flickering and sometimes leaving features invisible.

2. **Missing Feature**: The Feature Inspector lacks a show/hide toggle button that the Feature List has.

---

## Root Cause Analysis

### Visibility Toggle Bug

In `useFeatureRenderer.ts`, the main initialization effect (lines 132-315) includes `hiddenFeatureIds` in its dependencies:

```javascript
}, [map, features, editingGeometryFeatureId, hiddenFeatureIds, toGeoJSON]);
```

When a user clicks the eye icon:
1. `hiddenFeatureIds` Set changes
2. The main effect runs its cleanup (hides all layers with `visibility: 'none'`)
3. Then re-runs setup (which shows layers again)
4. This causes flickering and potential race conditions

**The Fix**: Remove `hiddenFeatureIds` from the initialization effect dependencies. The separate data-update effect (lines 318-330) already handles filtering hidden features from the source data, which is the correct way to hide features.

---

## Technical Changes

### File 1: `src/hooks/useFeatureRenderer.ts`

| Change | Description |
|--------|-------------|
| Remove `hiddenFeatureIds` from setup effect deps | The data-update effect already handles this correctly |
| Remove `editingGeometryFeatureId` from setup effect deps | Same reason - data effect handles it |
| Keep data-update effect unchanged | It properly filters and updates source data |

The initialization effect should only depend on:
- `map` - when map instance changes
- `toGeoJSON` - stable callback

The `features` dependency is needed to populate initial data, but we can handle this more carefully.

### File 2: `src/components/editor/FeatureInspector.tsx`

| Change | Description |
|--------|-------------|
| Add `isHidden` prop | Boolean indicating if current feature is hidden |
| Add `onToggleHidden` prop | Callback to toggle the feature's visibility |
| Add visibility toggle button | Eye icon button next to the feature name |

---

## Implementation Details

### `useFeatureRenderer.ts` Changes

Remove unnecessary dependencies from the setup effect:

```javascript
// OLD - causes re-init on every visibility toggle
}, [map, features, editingGeometryFeatureId, hiddenFeatureIds, toGeoJSON]);

// NEW - only re-init when map or core structure changes
}, [map, toGeoJSON]);
```

Also update the data synchronization in `setupLayers` to use refs for `features`, `editingGeometryFeatureId`, and `hiddenFeatureIds` so they're always current without triggering effect re-runs.

### `FeatureInspector.tsx` Changes

Add new props and UI:

```typescript
interface FeatureInspectorProps {
  // ... existing props
  isHidden?: boolean;
  onToggleHidden?: () => void;
}
```

Add toggle button in the header area near the feature name:

```jsx
{onToggleHidden && (
  <Button
    variant="ghost"
    size="icon"
    onClick={onToggleHidden}
    title={isHidden ? "Show on map" : "Hide on map"}
  >
    {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
)}
```

### `TrackEditor.tsx` Changes

Pass the new props to FeatureInspector:

```jsx
<FeatureInspector
  // ... existing props
  isHidden={featureContext.selectedFeature ? hiddenFeatureIds.has(featureContext.selectedFeature.id) : false}
  onToggleHidden={() => {
    if (featureContext.selectedFeature) {
      handleToggleVisibility(featureContext.selectedFeature.id);
    }
  }}
/>
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useFeatureRenderer.ts` | Fix effect dependencies to prevent re-initialization on visibility toggle |
| `src/components/editor/FeatureInspector.tsx` | Add `isHidden` prop, `onToggleHidden` prop, and eye toggle button |
| `src/pages/TrackEditor.tsx` | Pass visibility state and toggle handler to FeatureInspector |

---

## Result

After these changes:
1. Clicking the eye icon in the Feature List will immediately show/hide the feature without flickering
2. The Feature Inspector will have a matching eye toggle button for the selected feature
3. Both toggles will work consistently and in sync
4. Navigating between modes will not affect visibility state
