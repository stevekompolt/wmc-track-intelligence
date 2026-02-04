
# Maintain Polygon/Line Appearance During Geometry Editing

## Problem

When editing a polygon or line geometry (dragging vertices), the feature's stroke and fill disappear because the feature is hidden from the main renderer to avoid conflicts with the vertex markers. Currently, only the blue vertex dots are visible during editing.

## Solution

Add a dedicated "editing preview" layer in the `useFeatureGeometryEditor` hook that renders the feature being edited with its actual style properties (color, stroke opacity, fill opacity, stroke width). This layer will update in real-time as vertices are dragged.

---

## Technical Changes

### File: `src/hooks/useFeatureGeometryEditor.ts`

**Add a new Mapbox source and layers** to render the editing feature with its proper styling:

| Change | Description |
|--------|-------------|
| Add source/layer constants | Define IDs for the editing preview source and layers |
| Add source setup | Create a GeoJSON source for the feature being edited |
| Add polygon fill layer | Render fill with feature's `fillColor` and `fillOpacity` |
| Add stroke layer | Render stroke with feature's `color`, `opacity`, and `strokeWidth` |
| Update data on geometry change | Keep the editing layer in sync as vertices are dragged |
| Cleanup on unmount | Remove source and layers when editing ends |

**Implementation approach:**

1. When editing starts (`isEditing` becomes true):
   - Add a new GeoJSON source with the feature's current geometry
   - Add fill layer (for polygons) with the feature's `fillColor` and `fillOpacity`
   - Add stroke layer with the feature's `color`, `opacity`, and `strokeWidth`

2. During dragging:
   - Update the source data with the new geometry in real-time (this already happens via `onGeometryUpdate`, but we'll also update the editing source directly)

3. When editing ends:
   - Remove the editing source and layers

---

## Visual Result

**Before (current behavior):**
- Polygon disappears during geometry editing
- Only blue vertex markers visible

**After:**
- Polygon fill and stroke remain visible with configured colors and opacity
- Vertex markers overlay on top for dragging
- Real-time updates as vertices move

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useFeatureGeometryEditor.ts` | Add editing preview source/layers with feature styling |

