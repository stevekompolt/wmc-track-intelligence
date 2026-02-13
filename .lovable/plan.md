
# Fix: Deleting Map Layer Doesn't Remove Image from Map

## Problem
When deleting an overlay from the Map Layers list, the entry disappears from the list but the image remains rendered on the map.

## Root Cause
In `useMultiOverlayRenderer.ts`, the `updateOverlayLayer` function only tracks an overlay in `renderedOverlayIdsRef` when it **creates** a new source (the `else` branch). If the source already exists (e.g., after a style reload or re-render), the overlay ID is never added to the tracking set. Later, when `setupLayers` tries to clean up deleted overlays, it iterates `renderedOverlayIdsRef` -- but the ID isn't there, so `removeOverlayLayer` is never called and the layer remains on the map.

## Fix

### File: `src/hooks/useMultiOverlayRenderer.ts`

Two changes:

1. **Track overlays in both branches of `updateOverlayLayer`**: Move `renderedOverlayIdsRef.current.add(overlay.id)` so it runs whether the source is new or already exists.

2. **Add a safety net in `setupLayers`**: Instead of only checking `renderedOverlayIdsRef`, also directly query the map for any overlay sources that match the naming pattern and should be removed. This handles edge cases where the ref gets out of sync.

```typescript
// In updateOverlayLayer - move tracking OUTSIDE the if/else
if (source) {
  source.updateImage({ url: overlay.imageUrl, coordinates });
} else {
  map.addSource(sourceId, { type: 'image', url: overlay.imageUrl, coordinates });
  map.addLayer({ ... });
  map.triggerRepaint();
}
// Always track, regardless of new vs existing
renderedOverlayIdsRef.current.add(overlay.id);
```

```typescript
// In setupLayers - also check for orphaned layers directly on the map
renderedOverlayIdsRef.current.forEach(id => {
  if (!allOverlayIds.has(id) || !visibleIds.has(id)) {
    removeOverlayLayer(id);
  }
});

// Safety: check map directly for any orphaned overlay layers
const style = map.getStyle();
if (style?.sources) {
  Object.keys(style.sources).forEach(srcId => {
    if (srcId.startsWith('overlay-image-')) {
      const overlayId = srcId.replace('overlay-image-', '');
      if (!allOverlayIds.has(overlayId) || !visibleIds.has(overlayId)) {
        removeOverlayLayer(overlayId);
      }
    }
  });
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useMultiOverlayRenderer.ts` | Fix overlay ID tracking + add orphaned layer cleanup |

## Impact
- Ensures deleting an overlay from the list always removes its image from the map
- No changes to UI components or data model
- Defensive approach handles edge cases where tracking ref gets out of sync
