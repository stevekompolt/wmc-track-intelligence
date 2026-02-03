

# Feature Drawing Tools Implementation Plan

## Overview

This plan enables the Point, Line, and Polygon drawing tools in the Track Editor. The implementation follows the existing patterns used for overlay editing and viewpoint management, storing all spatial data as GeoJSON Features.

---

## Architecture

```text
+----------------------------------------------------------+
|                    Feature Drawing Flow                   |
+----------------------------------------------------------+
|                                                           |
|  User clicks tool button (Point/Line/Polygon)             |
|       │                                                   |
|       ▼                                                   |
|  Enter Drawing Mode                                       |
|  - Change cursor to crosshair                             |
|  - Show instruction in toolbar                            |
|  - Disable map pan (optional for polygon)                 |
|       │                                                   |
|       ▼                                                   |
|  Map Click Events                                         |
|  - Point: Single click places marker                      |
|  - Line: Click adds vertex, double-click finishes         |
|  - Polygon: Click adds vertex, close shape to finish      |
|       │                                                   |
|       ▼                                                   |
|  Feature Created → Show in Feature Inspector              |
|  - Edit properties (name, color, icon)                    |
|  - Set visibility (Fan/Media/Ops)                         |
|  - Save or Delete                                         |
|                                                           |
+----------------------------------------------------------+
```

---

## Data Model

### Feature Type Definition

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Unique identifier |
| `venueId` | string | Associated track/venue |
| `type` | 'point' \| 'line' \| 'polygon' | Geometry type |
| `name` | string | Display name |
| `description` | string | Optional description |
| `geometry` | GeoJSON.Geometry | Coordinates |
| `style` | FeatureStyle | Visual properties |
| `visibleToFans` | boolean | Visibility flag |
| `visibleToMedia` | boolean | Visibility flag |
| `visibleToOps` | boolean | Visibility flag |
| `status` | 'draft' \| 'published' | Workflow state |
| `zOrder` | number | Stacking order |
| `createdAt` | string | Timestamp |
| `updatedAt` | string | Timestamp |

### FeatureStyle Type

| Field | Type | Default |
|-------|------|---------|
| `color` | string | '#3B82F6' (blue) |
| `opacity` | number | 0.8 |
| `strokeWidth` | number | 2 |
| `fillColor` | string | Same as color |
| `fillOpacity` | number | 0.3 |
| `icon` | IconKey | 'none' |
| `iconSize` | number | 1 |

---

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/types/feature.ts` | Create | Feature type definitions |
| `src/hooks/useFeatureEditor.ts` | Create | Feature state and CRUD operations |
| `src/hooks/useFeatureDrawing.ts` | Create | Drawing mode and map interactions |
| `src/hooks/useFeatureRenderer.ts` | Create | Render features on map |
| `src/components/editor/FeatureInspector.tsx` | Create | Edit selected feature properties |
| `src/components/editor/FeatureList.tsx` | Create | List features for current venue |
| `src/services/featuresApi.ts` | Create | Mock API for feature persistence |
| `src/pages/TrackEditor.tsx` | Modify | Wire up drawing mode and inspector |

---

## Implementation Details

### 1. Feature Types (src/types/feature.ts)

```text
Define interfaces:
- FeatureType = 'point' | 'line' | 'polygon'
- FeatureStyle (color, opacity, stroke, fill, icon)
- VenueFeature (main feature entity)
- DrawingState (mode, partialCoords, isDrawing)
```

### 2. Drawing Mode Hook (src/hooks/useFeatureDrawing.ts)

The drawing hook manages:
- Current drawing mode (none/point/line/polygon)
- Partial coordinates during drawing
- Click handlers for adding vertices
- Finish/cancel operations

```text
Drawing Modes:
  'none' → Normal map interaction
  'point' → Single click places point
  'line' → Click adds vertex, double-click finishes
  'polygon' → Click adds vertex, click first point closes

State:
  mode: DrawingMode
  partialCoords: [number, number][]
  isDrawing: boolean
  
Methods:
  startDrawing(type)
  addVertex(lng, lat)
  finishDrawing() → VenueFeature
  cancelDrawing()
```

### 3. Map Click Handlers

When drawing mode is active:
1. Intercept map clicks before pan/zoom
2. Convert click to coordinates
3. Add to partial coordinates
4. Update preview layer showing work-in-progress

```text
Point Mode:
  - Single click → create feature immediately
  - Auto-open inspector for naming

Line Mode:
  - Click → add vertex, show preview line
  - Double-click → finish (min 2 points)
  - Escape → cancel

Polygon Mode:
  - Click → add vertex, show preview polygon
  - Click near first point → close and finish
  - Double-click → auto-close and finish
  - Escape → cancel
```

### 4. Feature Renderer (src/hooks/useFeatureRenderer.ts)

Render features using Mapbox GeoJSON sources:
- Points as circle/symbol layers
- Lines as line layers
- Polygons as fill + line layers

```text
Source: 'venue-features'
Layers:
  - 'feature-polygons-fill' (fill layer)
  - 'feature-polygons-stroke' (line layer)
  - 'feature-lines' (line layer)
  - 'feature-points' (circle/symbol layer)
  - 'feature-drawing-preview' (work-in-progress)
```

### 5. Feature Inspector (src/components/editor/FeatureInspector.tsx)

When a feature is selected, show editable properties:

```text
+----------------------------------------+
| FEATURE INSPECTOR                      |
+----------------------------------------+
| Name: [________________]               |
| Description: [________________]        |
|                                        |
| Type: Point                            |
| Coordinates: 40.585°, -111.88°         |
|                                        |
| STYLE                                  |
| Color: [■ #3B82F6 ▼]                  |
| Opacity: [====●====] 80%               |
| Icon: [Camera ▼] (points only)         |
|                                        |
| VISIBILITY                             |
| [✓] Fans  [✓] Media  [✓] Ops          |
|                                        |
| Status: [Draft ▼]                      |
|                                        |
| [Delete] [Save]                        |
+----------------------------------------+
```

### 6. Updated TrackEditor Flow

```text
Tool Button Click:
  1. Enter drawing mode via useFeatureDrawing
  2. Change toolbar to show "Click to place point" etc.
  3. Map cursor changes to crosshair
  
Map Click (while drawing):
  1. Capture coordinates
  2. For point: create immediately
  3. For line/polygon: add to preview
  
Drawing Complete:
  1. Create feature with default name
  2. Add to feature list
  3. Auto-select in inspector
  4. User edits properties
  5. Auto-save on changes
```

---

## UI Changes

### Toolbar During Drawing

When drawing mode is active, the top toolbar changes:

```text
┌──────────────────────────────────────────────────────────┐
│ ○ DRAWING POINT   Click to place • ESC to cancel        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ─ DRAWING LINE    Click to add points • Double-click to │
│                   finish • ESC to cancel                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ⬡ DRAWING POLYGON Click to add points • Close shape to  │
│                    finish • ESC to cancel                │
└──────────────────────────────────────────────────────────┘
```

### Feature Toolbox Buttons

Remove `disabled` and add click handlers:

```text
Before: disabled
After: onClick={() => startDrawing('point')}

Active state shows with primary border color
```

### Feature List (below toolbox)

```text
+----------------------------------------+
| FEATURES (3)                           |
+----------------------------------------+
| ● Start Line       Point     [draft]   |
| ─ Track Boundary   Line      [pub]     |
| ⬡ Safety Zone      Polygon   [draft]   |
+----------------------------------------+
```

---

## Technical Notes

### Preventing Map Pan During Drawing

Line and polygon drawing should not interfere with map interaction:
- Keep map pan enabled
- Use `e.preventDefault()` only on the click that adds a vertex
- Alternative: Brief "place mode" that disables pan

### GeoJSON Format

Features stored as standard GeoJSON:

```text
Point:
{
  type: 'Point',
  coordinates: [lng, lat]
}

Line:
{
  type: 'LineString',
  coordinates: [[lng1, lat1], [lng2, lat2], ...]
}

Polygon:
{
  type: 'Polygon',
  coordinates: [[[lng1, lat1], [lng2, lat2], ..., [lng1, lat1]]]
}
```

### Layer Ordering

Features should render below overlay but above base map:

```text
1. Base map tiles
2. Feature polygons (fill)
3. Feature lines
4. Feature points
5. Overlay image
6. Editing handles
```

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Create `src/types/feature.ts` with type definitions |
| 2 | Create `src/services/featuresApi.ts` with mock CRUD |
| 3 | Create `src/hooks/useFeatureEditor.ts` for state management |
| 4 | Create `src/hooks/useFeatureDrawing.ts` for drawing mode |
| 5 | Create `src/hooks/useFeatureRenderer.ts` for map rendering |
| 6 | Create `src/components/editor/FeatureInspector.tsx` |
| 7 | Create `src/components/editor/FeatureList.tsx` |
| 8 | Update `src/pages/TrackEditor.tsx` to wire everything together |
| 9 | Add keyboard shortcuts (Escape to cancel) |
| 10 | Add drawing preview layer for work-in-progress |

---

## Mock Data

Initial mock features for testing:

```text
[
  {
    id: 'feat-1',
    venueId: 'track-1',
    type: 'point',
    name: 'Start/Finish Line',
    geometry: { type: 'Point', coordinates: [-111.8825, 40.5855] },
    style: { color: '#22C55E', icon: 'flag' },
    status: 'published'
  },
  {
    id: 'feat-2',
    venueId: 'track-1',
    type: 'line',
    name: 'Pit Lane Path',
    geometry: { type: 'LineString', coordinates: [...] },
    style: { color: '#F59E0B', strokeWidth: 3 },
    status: 'draft'
  },
  {
    id: 'feat-3',
    venueId: 'track-1',
    type: 'polygon',
    name: 'Safety Zone A',
    geometry: { type: 'Polygon', coordinates: [[...]] },
    style: { color: '#EF4444', fillOpacity: 0.2 },
    status: 'published'
  }
]
```

---

## Success Criteria

| Requirement | Implementation |
|-------------|----------------|
| Point tool places markers | Single click creates point |
| Line tool draws paths | Click adds vertices, double-click finishes |
| Polygon tool draws areas | Click adds vertices, closing finishes |
| Features persist | Mock API with localStorage |
| Visual customization | Color, opacity, icon options |
| Mode visibility | Per-feature Fan/Media/Ops toggles |
| Edit existing features | Click feature to select and inspect |
| Delete features | Button in inspector |
| Cancel drawing | Escape key exits drawing mode |
| Preview while drawing | Temporary layer shows work-in-progress |

