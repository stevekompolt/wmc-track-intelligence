

# Cinematic Camera Engine Implementation Plan

## Overview

Create a broadcast-quality camera controller that powers the Fan Preview experience. The engine replaces basic `flyTo` with smooth, cinematic transitions that feel like a film trailer rather than a map navigation tool.

---

## Architecture

```text
+------------------------------------------------------------------+
|                        CinematicCameraEngine                      |
+------------------------------------------------------------------+
|                                                                   |
|  ┌─────────────────┐     ┌──────────────────┐                    |
|  │  ViewpointData  │────▶│  PathCalculator  │                    |
|  │  (from API)     │     │  (pre-compute)   │                    |
|  └─────────────────┘     └────────┬─────────┘                    |
|                                   │                               |
|                                   ▼                               |
|  ┌─────────────────┐     ┌──────────────────┐                    |
|  │  useCameraEngine│◀────│  AnimationLoop   │                    |
|  │  (React hook)   │     │  (requestAnimFrame)                   |
|  └────────┬────────┘     └──────────────────┘                    |
|           │                                                       |
|           ▼                                                       |
|  ┌─────────────────────────────────────────┐                     |
|  │           TrackMap (Mapbox GL)          │                     |
|  │  - setCenter(), setZoom(), setBearing() │                     |
|  │  - Interactions disabled in Fan mode    │                     |
|  └─────────────────────────────────────────┘                     |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Core Components

### 1. Types: `src/types/camera.ts`

New type definitions for the camera engine:

| Type | Purpose |
|------|---------|
| `CameraTarget` | Extended viewpoint with optional bounding box and target element |
| `CameraTransition` | Defines a single camera animation with easing and duration |
| `EasingProfile` | Configurable easing curve (ease-in %, glide %, ease-out %) |
| `CameraConstraints` | Min altitude, max pitch, roll limits |
| `CameraEngineState` | Current engine state (animating, idle, drifting) |

```text
CameraTarget {
  latitude: number
  longitude: number
  height: number
  heading: number
  pitch: number
  roll: number
  boundingBox?: [sw: [lng, lat], ne: [lng, lat]]
  targetElement?: { id: string, geometry: GeoJSON }
  sceneType?: 'standard' | 'hero' | 'final'
}

EasingProfile {
  easeInPercent: number   // 0.20 (20%)
  glidePercent: number    // 0.60 (60%)
  easeOutPercent: number  // 0.20 (20%)
}
```

---

### 2. Easing Functions: `src/lib/cameraEasing.ts`

Custom easing curves for cinematic motion:

| Function | Purpose |
|----------|---------|
| `cinematicEase(t, profile)` | Main easing function with 3-phase profile |
| `calculateDuration(distance)` | Distance-based duration (6-10 seconds) |
| `calculateCinematicTilt(progress)` | Subtle 2-4° tilt during approach |
| `interpolateCamera(start, end, t)` | Smooth camera state interpolation |
| `greatCircleDistance(p1, p2)` | Calculate distance between viewpoints |

Easing curve implementation:
- Phase 1 (0-20%): Ease-in using cubic bezier
- Phase 2 (20-80%): Steady glide (near-linear)
- Phase 3 (80-100%): Ease-out using cubic bezier

---

### 3. Camera Engine Hook: `src/hooks/useCameraEngine.ts`

Main hook that orchestrates camera animations:

| Property/Method | Purpose |
|-----------------|---------|
| `flyToTarget(target, options)` | Animate to a camera target |
| `cancelAnimation()` | Gracefully cancel current animation |
| `startDrift()` | Begin subtle micro-motion when paused |
| `stopDrift()` | Stop drift motion |
| `isAnimating` | Current animation state |
| `progress` | Animation progress (0-1) |

**Animation Loop Logic:**
- Uses `requestAnimationFrame` for 60fps target
- Calculates interpolated camera state each frame
- Applies cinematic tilt during mid-animation
- Handles interruption by blending to new target

**Drift Motion:**
- Subtle heading oscillation (±2° over 20s)
- Gentle pitch variation (±1° over 15s)
- Uses sine waves for smooth motion
- Never freezes completely when paused

---

### 4. Extended Map Handle: `src/components/editor/TrackMap.tsx`

Extend the imperative handle with new camera methods:

| Method | Purpose |
|--------|---------|
| `setCameraState(state)` | Directly set camera without animation |
| `setInteractionsEnabled(enabled)` | Enable/disable user interactions |
| `getMapInstance()` | Access raw Mapbox instance for drift |

**Fan Mode Behavior:**
- Disable `dragPan`, `dragRotate`, `scrollZoom`, `touchZoomRotate`
- Disable `doubleClickZoom`, `keyboard`
- Hide navigation controls
- Map remains visually interactive (hover effects, etc.)

---

### 5. Cinematic Context: `src/contexts/CinematicContext.tsx`

Extends ViewpointContext with camera engine integration:

| Property | Purpose |
|----------|---------|
| `cameraEngine` | Reference to useCameraEngine hook |
| `transitionToViewpoint(vp, options)` | Cinematic fly-to with all features |
| `isDrifting` | Whether camera is in drift mode |
| `interactionsEnabled` | Whether user can control map |

**Mode-Aware Behavior:**
- Fan mode: Interactions disabled, drift enabled when paused
- Other modes: Full interactions, no drift

---

### 6. Path Pre-calculation: `src/lib/cameraPathCalculator.ts`

Pre-compute camera paths for tour scenes:

| Function | Purpose |
|----------|---------|
| `calculateTourPath(viewpoints)` | Pre-calculate all transitions |
| `validateViewpoint(vp)` | Check for missing data, apply fallbacks |
| `frameBoundingBox(bbox, padding)` | Calculate camera for bounding box |

**Validation & Fallbacks:**
- If viewpoint incomplete: use venue centroid
- If pitch missing: use 45° default
- If heading missing: calculate from previous viewpoint
- Log warnings silently (console.warn)

---

## Integration Points

### Tour Hook Integration: `src/hooks/useCinematicTour.ts`

Update to use CinematicContext instead of direct flyTo:

```text
Before: setActiveViewpoint(viewpoint)
After:  transitionToViewpoint(viewpoint, {
          sceneType: 'standard' | 'hero' | 'final',
          onComplete: advanceScene
        })
```

**Scene Duration Mapping:**
- Standard scene: 8 seconds (matches animation duration)
- Hero scene: 12-15 seconds
- Final scene: 15 seconds with slow pull-back

---

### UI Text Fade Coordination

Update FanPreviewPanel to coordinate text with camera:

| Progress | UI Behavior |
|----------|-------------|
| 0-30% | Fade out current scene text |
| 30-70% | Text hidden |
| 70-100% | Fade in next scene text |

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/camera.ts` | Create | Camera engine types |
| `src/lib/cameraEasing.ts` | Create | Easing functions and math |
| `src/lib/cameraPathCalculator.ts` | Create | Path pre-calculation |
| `src/hooks/useCameraEngine.ts` | Create | Main camera animation hook |
| `src/contexts/CinematicContext.tsx` | Create | Cinematic camera context |
| `src/components/editor/TrackMap.tsx` | Modify | Extended handle, interaction control |
| `src/hooks/useCinematicTour.ts` | Modify | Use cinematic transitions |
| `src/components/fan/FanPreviewPanel.tsx` | Modify | Text fade coordination |
| `src/components/fan/SceneCard.tsx` | Modify | Progress-based fade |
| `src/pages/FanExperience.tsx` | Modify | Enable cinematic mode |
| `src/App.tsx` | Modify | Add CinematicProvider |

---

## Camera Constraints

Enforced limits to prevent visual issues:

| Constraint | Value | Reason |
|------------|-------|--------|
| Min altitude | zoom 10 | Prevent ground collision |
| Max pitch | -75° | Prevent horizon flip |
| Roll limit | ±5° | Maintain horizon stability |
| Min zoom | 8 | Prevent world wrap |
| Max zoom | 20 | Prevent texture blur |

---

## Easing Visualization

```text
Speed
  ▲
  │    ┌───────────────────────────┐
  │   ╱                             ╲
  │  ╱                               ╲
  │ ╱                                 ╲
  │╱                                   ╲
  └─────────────────────────────────────▶ Time
   0%   20%                      80%  100%
   
   ◀─▶  ◀────────────────────────▶  ◀──▶
   Ease  Steady Glide (60%)         Ease
   In                                Out
   (20%)                            (20%)
```

---

## Cinematic Tilt Behavior

During camera transitions:

```text
Pitch Offset
    ▲
 +4°│      ╱╲
 +2°│    ╱    ╲
  0°├──╱────────╲──────▶ Progress
 -2°│
    └─────────────────
    0%   50%      100%
    
Approach: slight tilt toward target
Arrival: level out smoothly
```

---

## Drift Motion Pattern

When tour is paused, camera continues subtle motion:

```text
Heading Offset (±2° over 20s period)
    ▲
 +2°│  ╱╲      ╱╲      ╱╲
  0°├─╱──╲────╱──╲────╱──╲─▶ Time
 -2°│╱    ╲  ╱    ╲  ╱
    └───────────────────
    
Pitch Offset (±1° over 15s period)
    ▲
 +1°│   ╱╲    ╱╲    ╱╲
  0°├──╱──╲──╱──╲──╱──╲─▶ Time
 -1°│ ╱    ╲╱    ╲╱
    └────────────────
```

---

## Interruption Handling

When user clicks a new target during animation:

| Action | Behavior |
|--------|----------|
| Scene dot click | Blend from current position to new target |
| Viewpoint click | Same blend behavior |
| Pause | Stop animation, start drift |
| Resume | Blend from drift position to next scene |

**Blend Curve:**
- Capture current camera state
- Treat as new "from" position
- Start new animation with fresh easing
- No visible snap or jump

---

## Day/Night Handling

| Change | Animation |
|--------|-----------|
| Map style | 2-second crossfade |
| Shadows | Fade smoothly (handled by Mapbox) |
| Camera | No change to position or motion |

---

## Performance Considerations

| Optimization | Implementation |
|--------------|----------------|
| Pre-calculate paths | On venue load, compute all scene transitions |
| RAF throttle | Skip frames if behind, maintain timing |
| State batching | Single setState per frame |
| No blocking | All math is synchronous, simple arithmetic |
| Memory | Reuse camera state objects |

---

## Design Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Camera always animated | Animation loop never stops (drift when idle) |
| No user pan/zoom/rotate | Interactions disabled in Fan mode |
| Viewpoint-driven only | All motion from Viewpoint records |
| Non-linear easing | Custom 3-phase easing curve |
| No snaps or jumps | Blend interruptions smoothly |
| 6-10s transitions | Distance-calculated duration |
| Cinematic tilt | 2-4° during approach |
| Micro-drift when paused | Sine wave oscillation |
| 60fps target | requestAnimationFrame loop |
| Failsafe fallbacks | Venue centroid if data incomplete |

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Create camera types (`src/types/camera.ts`) |
| 2 | Create easing functions (`src/lib/cameraEasing.ts`) |
| 3 | Create path calculator (`src/lib/cameraPathCalculator.ts`) |
| 4 | Create camera engine hook (`src/hooks/useCameraEngine.ts`) |
| 5 | Update TrackMap with extended handle and interaction control |
| 6 | Create CinematicContext (`src/contexts/CinematicContext.tsx`) |
| 7 | Update useCinematicTour to use cinematic transitions |
| 8 | Update FanPreviewPanel for text fade coordination |
| 9 | Update SceneCard with progress-based fade |
| 10 | Update FanExperience to enable cinematic mode |
| 11 | Update App.tsx with CinematicProvider |
| 12 | Test end-to-end tour playback |

