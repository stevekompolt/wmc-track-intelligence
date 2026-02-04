
# Auto-Detect Track Asphalt Feature

## Overview

Add a new "Auto-Detect Track" capability to the Feature Toolbox that analyzes satellite imagery visible in the current map view and automatically generates an editable polygon feature representing the detected track asphalt surface.

---

## How It Works

The detection process uses client-side image analysis on a snapshot of the map canvas:

1. **Capture**: Take a snapshot of the current Mapbox canvas (satellite imagery)
2. **Analyze**: Process the image to identify dark asphalt pixels using color thresholding
3. **Trace**: Convert detected pixels into a polygon boundary using contour tracing
4. **Create**: Generate an editable VenueFeature polygon that the user can refine

---

## Technical Approach

### Detection Algorithm

Since track asphalt is typically dark gray/black against lighter surroundings, we use **color thresholding** in HSL color space:

| Step | Description |
|------|-------------|
| 1. Canvas Capture | Use `map.getCanvas().toDataURL()` to get current view as image |
| 2. Create Analysis Canvas | Draw image to offscreen canvas for pixel access |
| 3. Pixel Classification | For each pixel, check if it matches "asphalt" criteria: low saturation + low lightness |
| 4. Contour Extraction | Use marching squares algorithm to trace the boundary of detected regions |
| 5. Coordinate Conversion | Convert pixel coords back to geographic [lng, lat] using `map.unproject()` |
| 6. Simplification | Reduce polygon complexity using Douglas-Peucker algorithm |

### Detection Parameters (User Adjustable)

- **Darkness Threshold**: How dark a pixel must be (default: lightness < 35%)
- **Saturation Threshold**: Max color saturation for gray detection (default: < 20%)
- **Min Area**: Minimum detected area to include (filters noise)
- **Simplification Tolerance**: How much to smooth the resulting polygon

---

## New Files

### `src/hooks/useAsphaltDetection.ts`

Core detection logic hook:

```text
useAsphaltDetection({
  map: mapboxgl.Map,
  onDetectionComplete: (geometry: PolygonGeometry) => void,
})

Returns:
- isDetecting: boolean
- progress: number (0-100)
- detectAsphalt: () => Promise<void>
- cancelDetection: () => void
```

### `src/lib/imageAnalysis.ts`

Image processing utilities:

```text
- captureMapCanvas(map) -> ImageData
- classifyAsphaltPixels(imageData, thresholds) -> boolean[][]
- traceContours(binaryMask) -> number[][]
- pixelsToGeoCoords(pixels, map, bounds) -> [number, number][]
- simplifyPolygon(coords, tolerance) -> [number, number][]
```

---

## UI Changes

### File: `src/pages/TrackEditor.tsx`

Add "Detect Track" button to Feature Toolbox:

| Element | Description |
|---------|-------------|
| New Button | "Detect Track" with a scan/magic-wand icon |
| Detection Dialog | Modal showing progress and preview of detection |
| Settings Panel | Optional: sliders for threshold adjustments |

### Detection Flow

```text
User clicks "Detect Track"
    ↓
Switch to satellite view if not already
    ↓
Show detection dialog with progress
    ↓
Capture current map view
    ↓
Analyze pixels → Show preview overlay
    ↓
User clicks "Apply" or "Cancel"
    ↓
If Apply: Create new polygon feature named "Track Surface"
```

---

## Component: DetectTrackDialog

New dialog component for the detection workflow:

```text
┌─────────────────────────────────────────┐
│  DETECT TRACK SURFACE                 X │
├─────────────────────────────────────────┤
│                                         │
│   [Preview of detected boundary]        │
│                                         │
├─────────────────────────────────────────┤
│  Sensitivity                            │
│  ○───────●──────────○  Medium          │
│                                         │
│  Min Area                               │
│  ○──●────────────────○  Small          │
├─────────────────────────────────────────┤
│           [Cancel]    [Apply Detection] │
└─────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/imageAnalysis.ts` | Pixel analysis and contour tracing utilities |
| `src/hooks/useAsphaltDetection.ts` | Detection state management and orchestration |
| `src/components/editor/DetectTrackDialog.tsx` | UI dialog for detection workflow |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TrackEditor.tsx` | Add "Detect Track" button and integrate dialog |
| `src/components/editor/TrackMap.tsx` | Add `captureCanvas()` method to imperative handle |

---

## Generated Feature Properties

When detection succeeds, a new feature is created with:

| Property | Value |
|----------|-------|
| name | "Track Surface" (user can rename) |
| type | "polygon" |
| geometry | Detected polygon coordinates |
| style.color | "#333333" (dark gray) |
| style.fillOpacity | 0.3 |
| status | "draft" |
| description | "Auto-detected track surface" |

The feature is immediately selectable and editable using the existing geometry editing tools, allowing users to refine the detected boundary.

---

## Limitations and Considerations

| Consideration | Approach |
|---------------|----------|
| Accuracy | Color-based detection works best on high-contrast satellite imagery; may need manual refinement |
| Map Style | Works best with satellite/satellite-streets styles; will prompt user to switch if on a different style |
| Complex Tracks | May detect multiple disconnected regions for complex track layouts (e.g., figure-8 tracks) |
| Processing Time | Canvas analysis is synchronous but fast for typical viewport sizes |
| Browser Support | Uses standard Canvas 2D API, widely supported |

---

## Implementation Phases

**Phase 1 - Core Detection (This Plan)**
- Canvas capture and pixel analysis
- Basic contour tracing
- Feature creation with detected polygon

**Phase 2 - Refinements (Future)**
- Machine learning-based detection for better accuracy
- Multi-polygon support for complex track layouts
- Edge detection for more precise boundaries
