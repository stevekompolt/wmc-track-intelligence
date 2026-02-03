

# Venue Overlay Editor - Snapping & Auto-Fit Implementation

## Problem Analysis

Looking at the screenshot, the issue is clear:
- **North: 40.580477** and **South: 40.580477** are identical
- This creates an invalid bounding box (north must be > south)
- The overlay image was uploaded but cannot render because the bounding box has zero height

The root cause is in `createDefaultOverlay()` which sets all bounds to `0`, and when the user uploads an image, there's no automatic snap to venue bounds.

---

## Solution Overview

Implement a snapping-first workflow where:
1. When an image is uploaded, automatically snap to venue bounds
2. Add a dedicated Snapping Controls section with multiple snap sources
3. Show visual ghost preview before committing snap
4. Remove requirement for manual coordinate entry

---

## Architecture

```text
+----------------------------------------------------------+
|                    Snapping Flow                          |
+----------------------------------------------------------+
|                                                           |
|  Image Uploaded                                           |
|       │                                                   |
|       ▼                                                   |
|  Auto-detect aspect ratio                                 |
|       │                                                   |
|       ▼                                                   |
|  Calculate initial bounds from venue center + ratio       |
|       │                                                   |
|       ▼                                                   |
|  Render overlay immediately (no invalid state)            |
|                                                           |
|  ═══════════════════════════════════════════════════════  |
|                                                           |
|  Snap Source Selection                                    |
|       │                                                   |
|       ├── Venue Bounds ─────► Use track lat/lng + span    |
|       ├── Geometry ─────────► Pick polygon, use its bbox  |
|       ├── Element ──────────► Pick venue element bounds   |
|       ├── Viewpoint ────────► Use viewpoint camera frame  |
|       └── Image Metadata ───► Extract from image if geo   |
|                                                           |
|  Ghost Preview (50% opacity)                              |
|       │                                                   |
|       ▼                                                   |
|  "Snap Now" commits preview to actual bounds              |
|                                                           |
+----------------------------------------------------------+
```

---

## Data Model Extensions

### Extended MapOverlay Type

| Field | Type | Purpose |
|-------|------|---------|
| `snapSource` | SnapSource | Current snap mode |
| `targetElementId` | string | For Element snap |
| `targetGeometryId` | string | For Geometry snap |
| `targetViewpointId` | string | For Viewpoint snap |
| `autoFitOnLoad` | boolean | Re-snap when dependencies change |
| `rotation` | number | Degrees (0-360) |

### SnapSource Type

```text
type SnapSource = 
  | 'none'           // Free placement
  | 'venue_bounds'   // Track center + configurable span
  | 'geometry'       // Target polygon bounding box
  | 'element'        // Target venue element bounds
  | 'viewpoint'      // Frame from viewpoint camera
  | 'previous'       // Copy from another overlay
  | 'image_metadata' // Extract geo from image EXIF
```

---

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/types/overlay.ts` | Modify | Add SnapSource, extend MapOverlay |
| `src/hooks/useOverlayEditor.ts` | Modify | Add snap logic, auto-fit on upload |
| `src/hooks/useOverlaySnapping.ts` | Create | Snapping calculation logic |
| `src/components/editor/OverlayEditorPanel.tsx` | Modify | Add Snapping Controls section |
| `src/components/editor/SnapSourceSelector.tsx` | Create | Dropdown + target picker |
| `src/hooks/useMapOverlayRenderer.ts` | Modify | Add ghost preview layer |
| `src/pages/TrackEditor.tsx` | Modify | Pass venue bounds to editor |

---

## Implementation Details

### 1. Auto-Fit on Image Upload

When an image is uploaded:
1. Load image to detect dimensions
2. Calculate aspect ratio
3. Create bounding box centered on venue with correct proportions
4. Immediately render (no invalid state possible)

```text
onImageUpload(file):
  1. Create blob URL
  2. Load Image to get naturalWidth/naturalHeight
  3. aspectRatio = width / height
  4. baseSpan = 0.01 (configurable, ~1km)
  5. bounds = {
       north: venue.lat + (baseSpan / 2),
       south: venue.lat - (baseSpan / 2),
       east: venue.lng + (baseSpan * aspectRatio / 2),
       west: venue.lng - (baseSpan * aspectRatio / 2)
     }
  6. Update overlay with imageUrl + bounds
```

### 2. Snapping Controls UI

New section in the right panel between "Overlay Asset" and "Placement":

| Control | Type | Behavior |
|---------|------|----------|
| Snap Source | Dropdown | Select snap mode |
| Target Picker | Conditional | Shows for geometry/element/viewpoint |
| Snap Now | Button | Commits ghost preview |
| Re-Snap | Button | Reapply current snap |
| Reset to Free | Button | Clear snap, enable manual |

### 3. Ghost Preview

When snap source is selected (before commit):
- Show second overlay layer at 50% opacity
- Position at calculated snap bounds
- Animate transition (200-300ms) when committed

### 4. Venue Bounds Calculation

Current implementation uses fixed span (0.01). Enhanced version:
- Start with 0.015 (~1.5km) for motorsports venues
- Preserve image aspect ratio
- Offer "Fit Tight" vs "Fit Padded" options

---

## UI Changes

### New Snapping Section (between Asset and Placement)

```text
┌────────────────────────────────────────────┐
│ SNAPPING                                   │
├────────────────────────────────────────────┤
│ Snap Source                                │
│ ┌────────────────────────────────────────┐ │
│ │ ▼ Venue Bounds                         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌──────────────┐ ┌──────────────┐         │
│ │  Snap Now    │ │   Re-Snap    │         │
│ └──────────────┘ └──────────────┘         │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │     Reset to Free Placement            │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ☑ Auto-fit when image changes             │
└────────────────────────────────────────────┘
```

### Placement Section Update

Move coordinate inputs to a collapsible "Advanced" section:
- Most users never need manual coordinates
- Collapsed by default
- Includes precision nudge buttons (±0.00001°)

---

## Validation Changes

Remove blocking validation for invalid bounding box during editing:
- Auto-fit always produces valid bounds
- Show warning only if somehow bounds become invalid
- Never prevent rendering if image exists

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Extend `overlay.ts` with SnapSource and new fields |
| 2 | Create `useOverlaySnapping.ts` hook with calculation logic |
| 3 | Update `useOverlayEditor.ts` with auto-fit on image upload |
| 4 | Create `SnapSourceSelector.tsx` component |
| 5 | Update `OverlayEditorPanel.tsx` with new Snapping section |
| 6 | Update `useMapOverlayRenderer.ts` with ghost preview layer |
| 7 | Update `TrackEditor.tsx` to pass venue bounds |
| 8 | Move Placement coordinates to Advanced (collapsible) |
| 9 | Add animation for snap commit (200-300ms transition) |

---

## Technical Details

### Image Aspect Ratio Detection

```text
async function getImageAspectRatio(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(1); // fallback to square
    img.src = url;
  });
}
```

### Snap Bounds Calculation

```text
function calculateSnapBounds(
  venue: { lat: number; lng: number },
  aspectRatio: number,
  span: number = 0.015,
  padding: number = 1.0
): BoundingBox {
  const latSpan = span;
  const lngSpan = span * aspectRatio;
  
  return {
    north: venue.lat + (latSpan / 2) * padding,
    south: venue.lat - (latSpan / 2) * padding,
    east: venue.lng + (lngSpan / 2) * padding,
    west: venue.lng - (lngSpan / 2) * padding,
  };
}
```

### Ghost Preview Rendering

```text
// In useMapOverlayRenderer.ts
if (ghostBounds && isPreviewMode) {
  // Add second image source with 50% opacity
  map.addSource('overlay-ghost', {
    type: 'image',
    url: overlay.imageUrl,
    coordinates: ghostCoordinates,
  });
  
  map.addLayer({
    id: 'overlay-ghost-layer',
    type: 'raster',
    source: 'overlay-ghost',
    paint: {
      'raster-opacity': 0.5,
    },
  });
}
```

---

## Success Criteria

| Requirement | Implementation |
|-------------|----------------|
| No manual lat/lng required | Auto-fit on upload, snap controls |
| Overlay visible after upload | Immediate valid bounds from aspect ratio |
| Under 10 seconds to place | Upload → auto-snap → done |
| Ghost preview before commit | 50% opacity preview layer |
| Reversible snapping | Reset to Free Placement button |
| Works across modes | Same bounds for Fan/Media/Ops |

---

## Summary

This implementation:
1. **Fixes the immediate bug** by auto-fitting bounds when image is uploaded
2. **Adds visual snapping** with preview before commit
3. **Removes coordinate friction** by hiding manual inputs in Advanced
4. **Maintains data integrity** by ensuring bounds are always valid after any operation

