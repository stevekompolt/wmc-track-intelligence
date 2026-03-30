

# Fix: Glitchy Overlay Dragging

## Root Cause

Every drag event (fired ~60 times/sec) calls `overlayContext.updateBoundingBox()` or `overlayContext.updateOverlay()`, which:

1. Calls `overlaysApi.updateOverlay()` — an **async function with a 100ms simulated delay** that writes to **localStorage** on every tick
2. Triggers `setOverlays()` in React state, causing a full re-render
3. The re-render triggers the `useMultiOverlayRenderer` sync effect, which runs `setupLayers()` — tearing down and rebuilding Mapbox sources/layers on every drag pixel
4. Meanwhile, `updateMarkerPositions` skips updates during drag (`isDraggingRef.current`), but the full layer rebuild still happens underneath

This creates a cascade of async state updates, localStorage writes, and layer rebuilds that produces visible stutter.

## Fix Strategy

Separate **drag-time updates** (fast, local-only) from **committed updates** (persisted to API/storage).

### Changes

**1. `src/contexts/OverlayContext.tsx` — Add optimistic local update method**
- Add `updateOverlayLocal(overlayId, updates)` — synchronous, updates React state only (no API call, no localStorage)
- Add `commitOverlay(overlayId)` — persists current state to API/storage (called on drag end)
- Expose both in context

**2. `src/pages/TrackEditor.tsx` — Use local updates during drag, persist on end**
- `handleCornerDrag` and `handleMoveDrag` call `updateOverlayLocal` instead of `updateOverlay`/`updateBoundingBox`
- Pass `onDragEnd` callback to the renderer that calls `commitOverlay` to persist final position
- Remove dependency on `overlayContext` object (use stable refs)

**3. `src/hooks/useMultiOverlayRenderer.ts` — Optimize drag-time rendering**
- Add `onDragEnd` callback option, fire it on marker dragend
- During drag, update only the Mapbox image source coordinates directly (via `source.setCoordinates()`) instead of triggering the full sync effect
- Throttle/skip the full `setupLayers` during active drag using `isDraggingRef`
- Remove excessive diagnostic `console.log` statements

**4. `src/services/overlaysApi.ts` — Remove artificial delays**
- Remove the `await new Promise(resolve => setTimeout(resolve, 100))` delays that add latency to every update

### Result
- Drag events update React state synchronously (no async, no localStorage)
- Mapbox source coordinates update directly during drag (no layer teardown)
- localStorage persist happens once on drag end
- Smooth 60fps dragging

