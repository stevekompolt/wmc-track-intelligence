

# Enable Feature Geometry Editing

## Problem Summary

Features (Points, Lines, Polygons) can be created and their properties (name, color, visibility) can be edited in the Feature Inspector. However, there is no way to **edit the geometry** - moving a point's location, adjusting line/polygon vertices, or moving an entire feature.

---

## Solution Overview

Add an "Edit Geometry" mode that enables interactive editing of feature positions and vertices directly on the map:

| Feature Type | Edit Capability |
|--------------|-----------------|
| Point | Drag to move location |
| Line | Drag vertices to reshape, drag mid-points to add vertices |
| Polygon | Drag vertices to reshape, drag mid-points to add vertices |

---

## Architecture

```text
User selects a feature
        |
        v
Feature Inspector shows "Edit Geometry" button
        |
        v
Enter Edit Mode
   - Show draggable vertex markers on geometry
   - Show mid-point markers for adding vertices (lines/polygons)
        |
        v
User drags vertex or mid-point
   - Update geometry in real-time
   - Save changes on drag end
        |
        v
Click "Done Editing" or select another feature
   - Exit edit mode
   - Remove vertex markers
```

---

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useFeatureGeometryEditor.ts` | Create | Handle vertex markers and drag interactions |
| `src/hooks/useFeatureEditor.ts` | Modify | Add updateGeometry method |
| `src/hooks/useFeatureRenderer.ts` | Modify | Highlight selected feature differently in edit mode |
| `src/components/editor/FeatureInspector.tsx` | Modify | Add "Edit Geometry" button and edit mode indicator |
| `src/pages/TrackEditor.tsx` | Modify | Wire up geometry editing state |
| `src/types/feature.ts` | Modify | Add EditMode type |

---

## Implementation Details

### 1. New Type Definitions (src/types/feature.ts)

Add edit mode types:

```text
export type GeometryEditMode = 'none' | 'editing';

export interface VertexMarkerData {
  index: number;         // Which vertex in the coordinates array
  type: 'vertex' | 'midpoint';  // Midpoints are between vertices
}
```

### 2. Geometry Editor Hook (src/hooks/useFeatureGeometryEditor.ts)

This hook manages:
- Creating draggable markers for each vertex
- Creating mid-point markers for adding new vertices
- Handling drag events to update geometry
- Cleaning up markers when exiting edit mode

Key functionality:

**For Points:**
- Single draggable marker at the point location
- On drag end, update feature geometry

**For Lines:**
- Draggable marker at each vertex
- Mid-point markers between vertices (clicking adds a new vertex)
- On vertex drag, update that coordinate in the array

**For Polygons:**
- Same as lines, but coordinates form a closed ring
- Last point must remain same as first point

```text
Hook Interface:
  useFeatureGeometryEditor({
    map: mapboxgl.Map | null;
    feature: VenueFeature | null;
    isEditing: boolean;
    onGeometryUpdate: (geometry: FeatureGeometry) => void;
  })
```

### 3. Update Feature Editor Hook (src/hooks/useFeatureEditor.ts)

Add method to update geometry:

```text
updateGeometry: (featureId: string, geometry: FeatureGeometry) => Promise<void>

Implementation:
  await updateFeature(featureId, { geometry });
```

### 4. Update Feature Inspector (src/components/editor/FeatureInspector.tsx)

Add editing controls:

```text
+----------------------------------------+
| Name: [________________]               |
| ...                                    |
|                                        |
| GEOMETRY                               |
| Point at 40.585°, -111.88°             |
| [Edit Geometry]  ← New button          |
|                                        |
| When editing:                          |
| [✓ Editing Geometry] [Done]            |
| Drag vertices on map to reposition    |
+----------------------------------------+
```

Props to add:
- `isEditingGeometry: boolean`
- `onStartEditingGeometry: () => void`
- `onStopEditingGeometry: () => void`

### 5. Update Feature Renderer (src/hooks/useFeatureRenderer.ts)

When a feature is in geometry edit mode:
- Hide the feature from the standard layers (to avoid visual conflict)
- The geometry editor hook will render its own preview

Add prop:
- `editingFeatureId: string | null`

Filter out the editing feature from the rendered collection:
```text
const renderableFeatures = editingFeatureId 
  ? features.filter(f => f.id !== editingFeatureId)
  : features;
```

### 6. Update TrackEditor (src/pages/TrackEditor.tsx)

Add state for geometry editing:

```text
const [editingGeometryFeatureId, setEditingGeometryFeatureId] = useState<string | null>(null);

// Hook for geometry editing
useFeatureGeometryEditor({
  map: mapInstance,
  feature: editingGeometryFeatureId ? featureEditor.features.find(f => f.id === editingGeometryFeatureId) : null,
  isEditing: !!editingGeometryFeatureId,
  onGeometryUpdate: (geometry) => {
    if (editingGeometryFeatureId) {
      featureEditor.updateGeometry(editingGeometryFeatureId, geometry);
    }
  },
});
```

---

## Visual Design

### Vertex Markers

```text
Normal Vertex:
  - 12px circle
  - Primary color fill
  - White border (2px)
  - Cursor: move

Midpoint (for adding vertex):
  - 8px circle
  - Semi-transparent primary color
  - Dashed border
  - Cursor: pointer
  - On click: adds vertex and becomes normal vertex
```

### Edit Mode Indicator

When editing geometry, show a blue highlight in the inspector:

```text
+----------------------------------------+
| GEOMETRY (Editing)          [✓] [Done] |
| Drag vertices to reposition            |
+----------------------------------------+
```

---

## Marker Lifecycle Management

Following the pattern from overlay editing to prevent marker recreation during drag:

1. **Separate lifecycle from position updates**
   - Create markers when entering edit mode
   - Remove markers when exiting edit mode
   - Update marker positions in-place during drag

2. **isDragging flag**
   - Prevent state-driven position updates from overriding active drag

3. **Stable callback refs**
   - Use refs for geometry update callbacks to avoid marker recreation

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Minimum vertices for line | Must have at least 2 vertices, prevent deletion below that |
| Minimum vertices for polygon | Must have at least 3 vertices (plus closing point) |
| Deleting vertices | Add delete button on vertex hover (future enhancement) |
| Undo geometry changes | Use existing feature update - can refresh from storage |

---

## Summary

This implementation adds interactive geometry editing by:
1. Creating a new hook for vertex marker management
2. Adding "Edit Geometry" button to the inspector
3. Rendering draggable markers at each vertex when editing
4. Updating feature geometry in real-time as user drags
5. Following the same patterns used for overlay corner/move editing to prevent marker recreation issues

