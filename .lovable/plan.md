

# Fix Line Feature Editing, Stroke Width, and Improve Track Detection

## Issues Identified

Based on my investigation, there are three distinct issues to address:

### Issue 1: Line disappears when clicking "Edit Geometry"

**Root Cause:** A race condition in `useFeatureGeometryEditor.ts`. The effect sequence is:
1. `removeEditingLayers()` is called immediately, setting `editingLayersAddedRef.current = false`
2. Then `createLayersAndMarkers()` is called which tries to add source and layers
3. However, the `removeEditingLayers()` cleanup tries to remove layers that may not exist yet, and the subsequent source/layer creation has timing issues with the effect dependencies

The main problem is that `feature` is in the dependency array, causing the entire cleanup and recreation cycle to run when the feature reference changes (even if the ID is the same). This combined with the `clearMarkers()` and `removeEditingLayers()` at the start means the layers get removed but may not be properly recreated.

### Issue 2: Stroke Width slider has no visible effect

**Root Cause:** In `useFeatureRenderer.ts`, the stroke width works correctly, but the rendering uses expression-based paint properties that read `strokeWidth` from the feature properties. The property IS being passed correctly, but when testing, users often have the feature selected - and selected features are hardcoded to width `4`.

Additionally, the layer needs to be updated when feature properties change. The current code only updates the source data, but Mapbox paint properties that use data-driven expressions should be working. Let me verify the property is being passed in the GeoJSON conversion - yes it is on line 53.

The actual issue may be that the slider range is 1-8px which is very subtle, especially on satellite imagery. Also need to verify the property update is propagating.

### Issue 3: Detect Track feature doesn't use the traced track line

**Current Behavior:** The "Detect Track" feature does a whole-canvas pixel analysis looking for dark asphalt. It has no concept of using an existing line as a guide or boundary.

**User Expectation:** If a user has already traced the track centerline with a Line feature, the detection should use that line as a guide - either to constrain the detection area or to create a buffer/corridor around the line.

---

## Technical Changes

### File 1: `src/hooks/useFeatureGeometryEditor.ts`

Fix the layer creation to ensure LineString features are properly displayed during editing:

| Change | Description |
|--------|-------------|
| Add explicit LineString layer | Create a separate layer specifically for LineString geometries to ensure they render |
| Fix cleanup/creation timing | Ensure layers are created synchronously and the source exists before layers |
| Add minimum line-width | Ensure stroke is visible even if style.strokeWidth is very small |
| Debug logging (temporary) | Add console logs to trace the issue during development |

### File 2: `src/hooks/useFeatureRenderer.ts`

Fix stroke width visibility:

| Change | Description |
|--------|-------------|
| Increase selected line width multiplier | Selected features use `strokeWidth + 2` instead of hardcoded `4` |
| Increase minimum stroke width | Ensure a minimum visible width of `2` for lines |

### File 3: `src/lib/imageAnalysis.ts`

Add support for using a boundary line as a detection guide:

| Change | Description |
|--------|-------------|
| Add `bufferLine()` function | Create a polygon buffer around a LineString geometry |
| Add `detectWithinBoundary()` function | Limit detection to pixels within a given polygon boundary |
| Modify `createDetectionPreview()` | Accept optional boundary line parameter |

### File 4: `src/hooks/useAsphaltDetection.ts`

Add option to use a selected line feature as boundary:

| Change | Description |
|--------|-------------|
| Add `boundaryLineCoords` option | Accept line coordinates to use as detection boundary |
| Create buffer polygon | Convert line to a buffered polygon for masking |
| Pass boundary to detection | Filter detection to only pixels within the boundary |

### File 5: `src/components/editor/DetectTrackDialog.tsx`

Add UI option to use selected track line:

| Change | Description |
|--------|-------------|
| Accept `selectedLineFeature` prop | Show if a line feature is currently selected |
| Add "Use as boundary" checkbox | Option to constrain detection to area around the line |
| Add buffer width slider | Control how wide the detection corridor is (e.g., 50-500m) |

### File 6: `src/pages/TrackEditor.tsx`

Pass selected line feature to detection dialog:

| Change | Description |
|--------|-------------|
| Detect if selected feature is a line | Pass it to the detection dialog |
| Update detection parameters | Include boundary when calling detection |

---

## Visual Changes

### Stroke Width Fix
- Lines will visibly change thickness when adjusting the slider
- Selected features will show `strokeWidth + 2` instead of always being `4`
- Minimum visible line width of `2px`

### Detection with Track Line
The dialog will show:

```text
DETECT TRACK SURFACE

[ ] Use selected track line as boundary

When checked, detection will only look for asphalt
within 100m of the traced line.

Buffer Width:
[====●=============] 100m

[Detect]  [Cancel]
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useFeatureGeometryEditor.ts` | Fix layer creation timing and LineString rendering |
| `src/hooks/useFeatureRenderer.ts` | Fix stroke width expression to be more visible |
| `src/lib/imageAnalysis.ts` | Add boundary-constrained detection support |
| `src/hooks/useAsphaltDetection.ts` | Accept boundary line parameter |
| `src/components/editor/DetectTrackDialog.tsx` | Add "use track line" option UI |
| `src/pages/TrackEditor.tsx` | Pass selected line to detection |

---

## Result

After these changes:
1. Line features will remain visible with draggable vertices when clicking "Edit Geometry"
2. The Stroke Width slider will have a visible effect on line thickness
3. Users who trace a track line first can use it to guide the asphalt detection, making detection much more accurate

