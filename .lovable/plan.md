

# Add 2D/3D Toggle: Mapbox ↔ CesiumJS

## Overview
Add a native CesiumJS viewer alongside Mapbox with a toggle button. Features, overlays, and viewpoints work in both engines. The Cesium Ion token is stored as a constant.

## Dependencies to Install
- `cesium` — CesiumJS core library
- `resium` — React components for Cesium (Viewer, Entity, GeoJsonDataSource, etc.)
- `vite-plugin-cesium` — handles Cesium static assets (Workers, ThirdParty) in Vite

## Changes

### 1. `vite.config.ts` — Add Cesium plugin
```ts
import cesium from 'vite-plugin-cesium';
// Add cesium() to plugins array
```

### 2. `src/lib/cesiumConfig.ts` — New file
Store the Cesium Ion token and initialize `Ion.defaultAccessToken`.

### 3. `src/components/editor/CesiumMap.tsx` — New file
A `resium` `<Viewer>` component with the same imperative handle interface as `TrackMap` (`flyToViewpoint`, `captureCamera`, `setCameraState`, `setInteractionsEnabled`, `getMapInstance`). Renders at the same coordinates as the selected track. Includes terrain and imagery from Cesium Ion.

### 4. `src/hooks/useCesiumFeatureRenderer.ts` — New file
Renders features (points, lines, polygons) and overlays as Cesium Entities via `GeoJsonDataSource`. Mirrors the logic of `useSharedFeatureRenderer` but targets the Cesium viewer. Mode-aware visibility is preserved.

### 5. `src/contexts/ViewpointContext.tsx` — Add engine state
- Add `engine: 'mapbox' | 'cesium'` state and `setEngine` action
- Expose via context so the toggle and renderers can read it

### 6. `src/components/layout/SharedMapContainer.tsx` — Conditional rendering
- Read `engine` from ViewpointContext
- Render `<TrackMap>` when engine is `mapbox`, `<CesiumMap>` when `cesium`
- When switching, capture current camera state from the active engine, mount the new one, and restore camera position
- Use the appropriate feature renderer hook based on engine

### 7. `src/components/layout/EngineToggle.tsx` — New file
A small "2D / 3D" toggle button positioned on the map (top-left area). Clicking switches `engine` in context. Shows current mode.

### 8. `src/pages/TrackEditor.tsx` — Update toolbar label
Change the static "2D VIEW" text to show "2D VIEW" or "3D VIEW" based on active engine.

### 9. `src/lib/cameraRenderers.ts` — Wire CesiumRenderer
Uncomment and complete the `CesiumRenderer` methods to use real Cesium API calls (`camera.flyTo`, `camera.setView`, `camera.lookAt`).

## Camera State Translation
- Mapbox uses zoom (0-22) for "height"; Cesium uses meters. Translation: `height_m = 591657550.5 / (2 ^ zoom)`
- Mapbox pitch is positive (0-85°); Cesium pitch is negative (0 to -90°). Translation: `cesium_pitch = -mapbox_pitch`
- Heading/bearing map 1:1

## Technical Notes
- The persistent map architecture is maintained — only the active engine is mounted
- Feature rendering in Cesium uses `GeoJsonDataSource` for the same GeoJSON that Mapbox uses
- Overlay images in Cesium use `Entity` with `RectangleGraphics` matching the bounding box
- Drawing tools (point/line/polygon) initially only work in 2D mode; the toggle disables drawing tools when in 3D and shows a tooltip explaining this

