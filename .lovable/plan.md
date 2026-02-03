

# Cinematic Camera Engine Refinement Plan

## Overview

The Cinematic Camera Engine is already implemented and functional. This plan aligns it more precisely with the Cesium-based camera math specification while maintaining Mapbox compatibility. We'll also add the missing `lookAt` behavior for target elements.

---

## Current Architecture (What You Have)

```text
+------------------------------------------------------------------+
|                    Current Implementation                         |
+------------------------------------------------------------------+
|                                                                   |
|  Salesforce                                                       |
|  ────────────                                                     |
|  Venue_Viewpoint__c                                               |
|    - lat / lon / height (degrees, zoom)                           |
|    - heading / pitch / roll (degrees)                             |
|    - bounding box                                                 |
|    - mode visibility                                              |
|              ↓                                                    |
|                                                                   |
|  React Hooks + Context                                            |
|  ────────────────────                                             |
|  useCameraEngine.ts ─── cameraEasing.ts                           |
|         ↓                                                         |
|  CinematicContext.tsx                                             |
|         ↓                                                         |
|                                                                   |
|  TrackMap (Mapbox GL JS)                                          |
|  ───────────────────────                                          |
|  - setCenter(), setZoom(), setBearing(), setPitch()               |
|                                                                   |
+------------------------------------------------------------------+
```

This is the **correct architecture**. The engine is a shared runtime service that Lovable calls, not implements.

---

## Refinements Needed

### 1. Pitch Semantics Alignment

**Current:** Mapbox uses positive pitch (0° = level, 60° = looking down)
**Spec:** Cesium uses negative pitch (0° = horizon, -90° = straight down)

**Solution:** Add pitch direction configuration:

```text
// In cameraEasing.ts
function normalizePitch(pitch: number, targetEngine: 'mapbox' | 'cesium'): number {
  if (targetEngine === 'cesium') {
    // Cesium: 0 = horizon, -90 = down
    return Math.max(-75, Math.min(-5, pitch));
  } else {
    // Mapbox: 0 = level, 85 = max
    return Math.abs(Math.max(-75, Math.min(-5, pitch)));
  }
}
```

---

### 2. Add Target Element LookAt Support

**Current:** Not implemented
**Spec:** When a viewpoint has a Target Element, use `lookAt` behavior

**Solution:** Add orbit/lookAt mode to the camera engine:

| File | Change |
|------|--------|
| `src/types/camera.ts` | Add `lookAtTarget` and `orbitConfig` to `CameraTarget` |
| `src/hooks/useCameraEngine.ts` | Add `orbitAroundTarget()` method |
| `src/lib/cameraEasing.ts` | Add `calculateOrbitPosition()` function |

---

### 3. Scene-Specific Pitch Presets

Add recommended pitch ranges by scene type:

| Scene Type | Pitch Range | Description |
|------------|-------------|-------------|
| aerial_reveal | -20° to -35° | Wide establishing shot |
| track_follow | -10° to -25° | Following the action |
| grandstand_pov | -5° to -15° | Fan perspective |
| overhead | -45° to -65° | Cinematic bird's eye |

---

### 4. Add Cesium Renderer Adapter (Future-Proofing)

To support both Mapbox and Cesium from the same engine:

```text
interface CameraRenderer {
  flyTo(target: CameraTarget, options: TransitionOptions): void;
  lookAt(target: Cartesian3, orientation: HeadingPitchRange): void;
  setCameraState(state: CameraState): void;
  getCameraState(): CameraState;
}

class MapboxRenderer implements CameraRenderer { ... }
class CesiumRenderer implements CameraRenderer { ... }
```

This abstraction allows the engine to work with either renderer.

---

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/types/camera.ts` | Modify | Add orbit config, lookAt target, pitch presets |
| `src/lib/cameraEasing.ts` | Modify | Add pitch normalization, orbit calculations |
| `src/hooks/useCameraEngine.ts` | Modify | Add `orbitAroundTarget()` method |
| `src/lib/cameraRenderers.ts` | Create | Renderer abstraction (Mapbox + future Cesium) |
| `src/lib/cameraPresets.ts` | Create | Scene-specific camera presets |

---

## Type Additions

### Extended CameraTarget

```text
interface CameraTarget {
  // Existing fields...
  
  // NEW: Target element for lookAt behavior
  lookAtTarget?: {
    latitude: number;
    longitude: number;
    height: number;
  };
  
  // NEW: Orbit configuration
  orbitConfig?: {
    maxArc: number;      // Max 15 degrees
    speed: number;       // Degrees per second
    direction: 'cw' | 'ccw';
  };
  
  // NEW: Scene-specific pitch preset
  pitchPreset?: 'aerial_reveal' | 'track_follow' | 'grandstand_pov' | 'overhead';
}
```

### Camera Presets

```text
const CAMERA_PRESETS = {
  aerial_reveal: { pitchRange: [-35, -20], duration: 10 },
  track_follow: { pitchRange: [-25, -10], duration: 8 },
  grandstand_pov: { pitchRange: [-15, -5], duration: 8 },
  overhead: { pitchRange: [-65, -45], duration: 12 },
};
```

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Add pitch preset types to `camera.ts` |
| 2 | Add `normalizePitch()` function to `cameraEasing.ts` |
| 3 | Create `cameraPresets.ts` with scene-specific defaults |
| 4 | Add lookAt target support to `CameraTarget` type |
| 5 | Add `orbitAroundTarget()` to `useCameraEngine.ts` |
| 6 | Create `cameraRenderers.ts` abstraction (optional, for Cesium) |
| 7 | Update viewpoint mock data with pitch presets |

---

## What Stays the Same

The core architecture is correct and shouldn't change:

| Component | Status |
|-----------|--------|
| `useCameraEngine.ts` location | ✅ Correct (React hook) |
| `cameraEasing.ts` math | ✅ Correct (pure functions) |
| `CinematicContext.tsx` pattern | ✅ Correct (React context) |
| Separation from UI | ✅ Correct (Lovable calls, doesn't implement) |
| Salesforce stores degrees | ✅ Correct |
| Engine converts for renderer | ✅ Correct |

---

## Governance Rule (Recommendation)

Document and enforce:

> **Lovable may CALL the Cinematic Camera Engine,**
> **but may not MODIFY camera math or constraints.**

This keeps the engine stable and reusable across modes.

---

## Technical Details

### Orbit Calculation

For target elements with orbit behavior:

```text
function calculateOrbitPosition(
  targetLat: number,
  targetLon: number,
  distance: number,
  heading: number,
  arcProgress: number,
  maxArc: number
): { lat: number; lon: number; heading: number } {
  // Calculate position on arc around target
  const arcHeading = heading + (arcProgress * maxArc);
  
  // Position camera at distance from target, looking at target
  const lat = targetLat + Math.cos(toRadians(arcHeading)) * (distance / 111); // rough km to degrees
  const lon = targetLon + Math.sin(toRadians(arcHeading)) * (distance / 111);
  
  // Camera heading points at target
  const cameraHeading = (arcHeading + 180) % 360;
  
  return { lat, lon, heading: cameraHeading };
}
```

### Pitch Direction Reference

```text
Mapbox GL JS:
  0° = looking at horizon
  85° = looking down (max)
  Uses POSITIVE values

Cesium:
  0° = looking at horizon  
  -90° = looking straight down
  Uses NEGATIVE values

Conversion:
  cesiumPitch = -1 * mapboxPitch
```

---

## Summary

The Cinematic Camera Engine is architecturally correct. This plan adds:

1. **Pitch normalization** for Cesium compatibility ✅
2. **LookAt/Orbit support** for target elements ✅
3. **Scene presets** for recommended camera angles ✅
4. **Renderer abstraction** (optional) for multi-engine support ✅

The engine continues to live in your Git repo, deployed by Lovable, maintained by your team — exactly as specified.

---

## Implementation Status

| File | Status |
|------|--------|
| `src/types/camera.ts` | ✅ Extended with LookAtTarget, OrbitConfig, PitchPreset |
| `src/lib/cameraEasing.ts` | ✅ Added normalizePitch, calculateOrbitPosition, toRadians/toDegrees |
| `src/lib/cameraPresets.ts` | ✅ Created with scene presets and mode constraints |
| `src/lib/cameraRenderers.ts` | ✅ Created with MapboxRenderer and CesiumRenderer stubs |
| `src/hooks/useCameraEngine.ts` | ✅ Added orbitAroundTarget method |

---

## Map Overlay Editor (Completed)

A 2D ground overlay editor for placing venue diagrams over the map.

### Files Created

| File | Purpose |
|------|---------|
| `src/types/overlay.ts` | MapOverlay data model, BoundingBox, validation |
| `src/hooks/useOverlayEditor.ts` | Editor state, autosave, undo, drag handlers |
| `src/hooks/useMapOverlayRenderer.ts` | Mapbox image source + corner/move markers |
| `src/components/editor/OverlayEditorPanel.tsx` | Right-panel UI with all controls |

### Features

- **Overlay Asset**: Image upload (PNG/SVG), preview, URL copy
- **Placement Controls**: North/South/East/West inputs, Center/Fit/Reset buttons
- **Visual Controls**: Opacity slider, Z-order, Fan/Media/Ops visibility toggles
- **Interaction Tools**: Corner drag handles, move mode, lock toggle
- **Metadata**: Name, description, Draft/Published/Archived status
- **Autosave**: 1-second debounce with "Saved" confirmation
- **Undo**: Single-step undo support
