

# Fix: Image Overlays Not Appearing on Map After Upload

## Root Cause

When an image is uploaded to an overlay, the flow is:
1. `updateImageUrl` loads the image to get its aspect ratio (async)
2. Calculates bounds and calls `updateOverlay` (another async step with 100ms API delay)
3. State updates and the `useMultiOverlayRenderer` effect should re-run

The problem is in `useMultiOverlayRenderer.ts` -- the sync effect has two issues:
- A `map.once('style.load', setupLayers)` listener is registered but never cleaned up, which can cause stale closures to interfere with fresh renders
- There's no fallback mechanism if the layer addition fails silently (e.g., Mapbox image source not loading a data URL in time)

## Changes

### File: `src/hooks/useMultiOverlayRenderer.ts`

**Fix 1**: Clean up the `once` listener in the effect cleanup to prevent stale closures.

**Fix 2**: After adding a new image source/layer, call `map.triggerRepaint()` to ensure the map redraws.

**Fix 3**: Add a secondary `map.on('idle')` listener that checks if any pending overlays need rendering -- this catches edge cases where the initial `addSource`/`addLayer` calls silently fail.

### Specific code changes in the sync effect (~line 315):

```typescript
useEffect(() => {
    if (!map) return;
    
    const setupLayers = () => {
      const allOverlayIds = new Set(overlays.map(o => o.id));
      const visibleOverlays = overlays.filter(o => 
        !hiddenOverlayIds.has(o.id) && o.imageUrl
      );
      const visibleIds = new Set(visibleOverlays.map(o => o.id));
      
      renderedOverlayIdsRef.current.forEach(id => {
        if (!allOverlayIds.has(id) || !visibleIds.has(id)) {
          removeOverlayLayer(id);
        }
      });
      
      visibleOverlays.forEach(overlay => {
        updateOverlayLayer(overlay);
      });
      
      // Force repaint after layer changes
      map.triggerRepaint();
    };
    
    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }
    
    const handleStyleLoad = () => {
      renderedOverlayIdsRef.current.clear();
      setupLayers();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      // Also remove the once listener to prevent stale closure
      map.off('style.load', setupLayers);
    };
  }, [map, overlays, hiddenOverlayIds, updateOverlayLayer, removeOverlayLayer]);
```

### In `updateOverlayLayer` callback:

Add `map.triggerRepaint()` after adding a new source+layer:

```typescript
map.addLayer({
  id: layerId,
  type: 'raster',
  source: sourceId,
  paint: {
    'raster-opacity': overlay.opacity,
    'raster-fade-duration': 0,
  },
});

renderedOverlayIdsRef.current.add(overlay.id);
map.triggerRepaint();  // <-- Ensure immediate visual update
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useMultiOverlayRenderer.ts` | Fix cleanup, add triggerRepaint after layer add |

## Impact

- Fixes regression where uploaded images don't appear on the map
- No changes to data model or UI components
- Defensive fix that handles edge cases in Mapbox rendering pipeline

