

# Fix: Markers Recreated on Every Drag Tick

## Root Cause

The `createMarkers` callback (line 282) depends on `overlays` in its dependency array. Every `updateOverlayLocal` call creates a new `overlays` array via `setOverlays`, which:

1. Recreates `createMarkers` (new reference)
2. Triggers the effect on line 403 (`useEffect(() => createMarkers(), [createMarkers])`)
3. Destroys all 4 markers and creates new ones — on every drag pixel

This is why you can only drag 10-20 pixels before it "resets." The marker gets removed and a new one is created at the updated position, losing the drag gesture.

Additionally, `handleCornerDrag` / `handleMoveDrag` depend on `overlayContext` (the entire context object), which is a new reference every render — compounding the issue.

## Fix

### 1. `src/hooks/useMultiOverlayRenderer.ts` — Decouple `createMarkers` from `overlays`

- Remove `overlays` from `createMarkers` dependency array
- Store overlays in a ref (`overlaysRef`) and read from it inside `createMarkers`
- `createMarkers` should only re-run when `map`, `editingOverlayId`, or `dragMode` changes — NOT when bounding box coordinates update
- The `updateMarkerPositions` path (which already skips during drag) handles coordinate sync separately

### 2. `src/hooks/useMultiOverlayRenderer.ts` — Guard the sync effect during drag

- The main sync effect (line 344) already checks `isDraggingRef.current`, but `overlays` changing still triggers it
- Add the overlays ref pattern here too so the effect doesn't re-run on every drag tick coordinate change
- Use a separate lightweight effect for drag-time coordinate updates that reads from the ref

### 3. `src/pages/TrackEditor.tsx` — Stabilize drag callbacks

- `handleCornerDrag`, `handleMoveDrag`, `handleDragEnd` depend on `overlayContext` (object identity changes every render)
- Use refs for `overlayContext.selectedOverlay` and the update functions to keep callbacks stable
- This prevents the renderer options from changing on every render, which would trigger marker recreation

### Summary of dependency chain fix

```text
Before (every drag pixel):
  updateOverlayLocal → new overlays array → new createMarkers → effect fires → markers destroyed & recreated

After:
  updateOverlayLocal → new overlays array → overlaysRef updated → NO effect fires
  Only updateOverlayCoordinates runs (updates Mapbox source in-place)
  Markers stay alive throughout the entire drag gesture
```

