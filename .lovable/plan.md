

# Fix Camera Handoff Between 2D/3D Toggle

## Problem
There is a race condition in the engine switch. The camera capture runs in a `useEffect` triggered by the `engine` state change, but by that time the previous engine's component is already unmounting and its ref is null. Additionally, CesiumMap uses a separate `cesiumRef` that is never read during the capture — `mapRef` only points to TrackMap.

## Root Cause
1. `EngineToggle` calls `setEngine()` which triggers a re-render
2. The `useEffect` in `SharedMapContainer` fires *after* the new engine value is set, meaning the old component is already gone
3. CesiumMap's ref (`cesiumRef`) is never consulted when capturing camera — only `mapRef` is used

## Fix

### 1. `SharedMapContainer.tsx` — Capture camera synchronously before engine switch
- Replace the `useEffect`-based capture with a callback passed to `EngineToggle`
- Create a `handleEngineSwitch` function that:
  1. Reads camera from `mapRef` (if switching from Mapbox) or `cesiumRef` (if switching from Cesium)
  2. Stores it in `savedCameraRef`
  3. Then calls `setEngine()`
- Pass `initialCameraState={savedCameraRef.current}` to **both** TrackMap and CesiumMap (add `initialCameraState` prop to TrackMap)

### 2. `TrackMap.tsx` — Accept `initialCameraState` prop
- Add optional `initialCameraState?: CameraState | null` prop
- When provided, use it to set initial center/zoom/bearing/pitch instead of the track defaults

### 3. `EngineToggle.tsx` — Accept an `onToggle` callback
- Instead of calling `setEngine` directly, call `props.onToggle()` which triggers the synchronous capture-then-switch flow in SharedMapContainer

### 4. `ViewpointContext.tsx` — No changes needed
The engine state and setEngine remain as-is; the fix is in the orchestration layer.

### Files Changed
- `src/components/layout/SharedMapContainer.tsx` — synchronous capture + pass initialCameraState to both engines
- `src/components/layout/EngineToggle.tsx` — accept `onToggle` prop
- `src/components/editor/TrackMap.tsx` — accept `initialCameraState` prop

