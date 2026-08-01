# One Layer, Many Polygons

Today each finished polygon becomes its own row in Map Layers, so drawing a second camping area produced "Camping" and "Camping 2". Change it so a layer is a single multi-part shape: while a polygon layer is selected, the next polygon you draw is added as another part of that same layer — one name, one style, one visibility/publish state.

## Behaviour

- Select a polygon layer (in Map Layers or on the map), click Polygon, draw: the finished shape joins the selected layer as a new part. Map Layers still shows one row, with a small "2 parts" badge.
- Nothing selected (or a point/line layer selected): drawing a polygon creates a new layer exactly as it does now.
- The Polygon button in the Feature Toolbox reads "Add to Camping" while a polygon layer is selected, so the destination is never a surprise. Deselect the layer to start a fresh one.
- Feature Inspector shows the part list ("Part 1 — 5 vertices", "Part 2 — 4 vertices") with a remove button per part and an "Add part" button that starts drawing straight into that layer. Removing the last remaining part is blocked; delete the layer instead.
- Edit Geometry works per part: vertex handles appear for every part, and dragging a handle only reshapes the part it belongs to.
- Styling, visibility flags (fans/media/ops), draft/publish and delete all apply to the whole layer, including every part.

## Technical notes

- `src/types/feature.ts`: add `MultiPolygonGeometry` (`coordinates: [number, number][][][]`) to the `FeatureGeometry` union. Polygon features stay `type: 'polygon'`; only the geometry shape changes when a second part is added.
- New `src/lib/polygonParts.ts` helpers: `getPolygonParts(geometry)` (returns rings for both Polygon and MultiPolygon), `appendPolygonPart(geometry, ring)`, `removePolygonPart(geometry, index)`, and `partVertexCount()` — collapsing back to a plain `Polygon` when one part remains, so existing single-shape data and consumers stay unchanged.
- `src/pages/TrackEditor.tsx` `handleFeatureComplete`: when the completed type is `polygon` and `featureContext.selectedFeature` is a polygon, call `updateGeometry` with the appended part and keep the layer selected; otherwise fall back to `createFeature` as today.
- Mapbox renderers (`src/hooks/useFeatureRenderer.ts`, `src/hooks/useSharedFeatureRenderer.ts`): the fill/stroke/hit-test filters currently test `['==', ['geometry-type'], 'Polygon']`, which excludes MultiPolygon — switch them to a filter covering both. The Cesium renderer loads GeoJSON through `GeoJsonDataSource`, which expands MultiPolygon into multiple styled entities already, so no change is needed there.
- `src/hooks/useFeatureGeometryEditor.ts`: replace the single-ring `getCoordinates`/`buildGeometry` pair with part-aware versions that carry a `partIndex` on each vertex handle and rebuild only the edited ring.
- `src/components/editor/FeatureInspector.tsx`: replace the single "5 vertices" line with the part list, per-part remove, and "Add part"; `src/components/editor/CollapsibleMapItemList.tsx` / `MapItemList.tsx` gain the part-count badge.
- Persistence is the existing localStorage-backed `featuresApi`, which stores geometry verbatim — no migration needed, and any future Salesforce write already treats geometry as GeoJSON.
- Lines and points are unchanged in this pass; multi-part lines can follow the same helper pattern later if wanted.