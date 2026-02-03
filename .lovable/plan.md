
# Fix Overlay Corner and Move Drag Functionality

## Problem Analysis

The corner handles and move feature are not working because of a **marker recreation loop** that interrupts drag operations.

### What's Happening:

```text
User drags corner handle
        │
        ▼
onCornerDrag() called with new position
        │
        ▼
updateOverlay({ boundingBox: newBox })
        │
        ▼
overlay state changes
        │
        ▼
updateMarkers() effect runs (depends on overlay)
        │
        ▼
markersRef.current.forEach(m => m.remove()) ← DESTROYS THE MARKER BEING DRAGGED
        │
        ▼
New markers created, but drag is cancelled
```

Every time the user drags, the marker they're dragging gets destroyed and recreated, which cancels the drag operation.

---

## Solution

**Separate marker positions from marker lifecycle.** Only recreate markers when drag mode changes, not when overlay bounds change. During drag, just update marker positions in place.

### Changes:

| File | Change |
|------|--------|
| `src/hooks/useMapOverlayRenderer.ts` | Separate marker creation from position updates |
| `src/pages/TrackEditor.tsx` | Use refs for stable callback references |

---

## Implementation Details

### 1. Split Marker Logic in useMapOverlayRenderer.ts

**Current:** Single `updateMarkers` function that recreates markers whenever overlay changes.

**Fixed:** Two separate concerns:
- `createMarkers()` - Only runs when dragMode changes (create/remove markers)
- `updateMarkerPositions()` - Only runs when overlay bounds change (reposition existing markers)

### 2. Update Marker Positions Without Recreating

When dragging, update existing marker positions using `marker.setLngLat()` instead of removing and recreating markers:

```text
// NEW: Update positions of existing markers
const updateMarkerPositions = useCallback(() => {
  if (!overlay) return;
  const { north, south, east, west } = overlay.boundingBox;
  
  // Update corner markers if they exist
  markersRef.current.get('nw')?.setLngLat([west, north]);
  markersRef.current.get('ne')?.setLngLat([east, north]);
  markersRef.current.get('sw')?.setLngLat([west, south]);
  markersRef.current.get('se')?.setLngLat([east, south]);
  
  // Update center marker if it exists
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;
  markersRef.current.get('center')?.setLngLat([centerLng, centerLat]);
}, [overlay?.boundingBox]);
```

### 3. Separate Effects for Lifecycle vs Position

```text
// Effect 1: Create/remove markers when drag mode changes
useEffect(() => {
  createMarkers();
}, [dragMode, overlay?.isLocked]);  // Only these dependencies

// Effect 2: Update positions when bounds change (does NOT recreate markers)
useEffect(() => {
  updateMarkerPositions();
}, [overlay?.boundingBox]);  // Only bounds dependency
```

### 4. Use Refs for Stable Drag Handlers

In `TrackEditor.tsx`, use refs to maintain stable references to the drag handlers so they don't cause marker recreation:

```text
// Use refs for stable callback references
const handleCornerDragRef = useRef(overlayEditor.handleCornerDrag);
handleCornerDragRef.current = overlayEditor.handleCornerDrag;

const handleMoveDragRef = useRef(overlayEditor.handleMoveDrag);
handleMoveDragRef.current = overlayEditor.handleMoveDrag;

// Pass stable callbacks to renderer
const stableCornerDrag = useCallback((corner, lat, lng) => {
  handleCornerDragRef.current(corner, lat, lng);
}, []);

const stableMoveDrag = useCallback((deltaLat, deltaLng) => {
  handleMoveDragRef.current(deltaLat, deltaLng);
}, []);
```

### 5. Skip Position Update During Active Drag

Add a flag to prevent updating marker positions while the marker is being dragged (since the user is controlling the position):

```text
const isDraggingRef = useRef(false);

marker.on('dragstart', () => {
  isDraggingRef.current = true;
});

marker.on('dragend', () => {
  isDraggingRef.current = false;
});

// In updateMarkerPositions:
if (isDraggingRef.current) return; // Don't override user's drag position
```

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useMapOverlayRenderer.ts` | Modify | Separate marker lifecycle from position updates |
| `src/pages/TrackEditor.tsx` | Modify | Use stable callback refs for drag handlers |

---

## Technical Details

### Why This Fixes the Problem

**Before:**
- Every drag event → overlay changes → markers destroyed → drag cancelled

**After:**
- Drag event → overlay changes → marker positions updated in place → drag continues
- Markers only created/destroyed when switching drag modes

### Dependencies After Fix

```text
createMarkers():
  dependencies: [map, dragMode, overlay?.isLocked]
  
updateMarkerPositions():
  dependencies: [overlay?.boundingBox.north, south, east, west]
  skips if: isDraggingRef.current === true
```

---

## Expected Behavior After Fix

1. User uploads image → overlay appears on map
2. User clicks "Corners" toggle → 4 corner handles appear
3. User drags a corner → overlay resizes smoothly
4. User clicks "Move" toggle → center handle appears
5. User drags center → overlay moves smoothly
6. All changes autosave after 1 second of inactivity
