// Hook for rendering features on the map

import { useEffect, useRef, useCallback } from 'react';
import type { VenueFeature, DrawingMode } from '@/types/feature';
import mapboxgl from 'mapbox-gl';

interface UseFeatureRendererOptions {
  map: mapboxgl.Map | null;
  features: VenueFeature[];
  partialCoords: [number, number][];
  drawingMode: DrawingMode;
  selectedFeatureId: string | null;
  editingGeometryFeatureId: string | null;
  hiddenFeatureIds: Set<string>;
  onFeatureClick: (featureId: string) => void;
}

const SOURCE_ID = 'venue-features';
const PREVIEW_SOURCE_ID = 'drawing-preview';

const LAYER_POLYGONS_FILL = 'feature-polygons-fill';
const LAYER_POLYGONS_STROKE = 'feature-polygons-stroke';
const LAYER_LINES = 'feature-lines';
const LAYER_POINTS = 'feature-points';
const LAYER_PREVIEW = 'drawing-preview-layer';

export function useFeatureRenderer({
  map,
  features,
  partialCoords,
  drawingMode,
  selectedFeatureId,
  editingGeometryFeatureId,
  hiddenFeatureIds,
  onFeatureClick,
}: UseFeatureRendererOptions): void {
  const sourceAddedRef = useRef(false);
  const previewSourceAddedRef = useRef(false);

  // Convert features to GeoJSON FeatureCollection
  const toGeoJSON = useCallback((featureList: VenueFeature[]): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: featureList.map(f => ({
        type: 'Feature' as const,
        id: f.id,
        properties: {
          id: f.id,
          name: f.name,
          featureType: f.type,
          color: f.style.color,
          opacity: f.style.opacity,
          strokeWidth: f.style.strokeWidth,
          fillColor: f.style.fillColor,
          fillOpacity: f.style.fillOpacity,
          selected: f.id === selectedFeatureId,
        },
        geometry: f.geometry as GeoJSON.Geometry,
      })),
    };
  }, [selectedFeatureId]);

  // Create preview GeoJSON for drawing in progress
  const createPreviewGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    if (partialCoords.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: GeoJSON.Feature[] = [];

    if (drawingMode === 'line' && partialCoords.length >= 1) {
      if (partialCoords.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { type: 'preview-line' },
          geometry: {
            type: 'LineString',
            coordinates: partialCoords,
          },
        });
      }
      // Add points at each vertex
      partialCoords.forEach((coord, i) => {
        features.push({
          type: 'Feature',
          properties: { type: 'preview-point', index: i },
          geometry: {
            type: 'Point',
            coordinates: coord,
          },
        });
      });
    } else if (drawingMode === 'polygon' && partialCoords.length >= 1) {
      if (partialCoords.length >= 3) {
        // Show polygon preview (not closed yet)
        features.push({
          type: 'Feature',
          properties: { type: 'preview-polygon' },
          geometry: {
            type: 'Polygon',
            coordinates: [[...partialCoords, partialCoords[0]]],
          },
        });
      } else if (partialCoords.length >= 2) {
        // Show line preview while building polygon
        features.push({
          type: 'Feature',
          properties: { type: 'preview-line' },
          geometry: {
            type: 'LineString',
            coordinates: partialCoords,
          },
        });
      }
      // Add points at each vertex
      partialCoords.forEach((coord, i) => {
        features.push({
          type: 'Feature',
          properties: { type: 'preview-point', index: i, isFirst: i === 0 },
          geometry: {
            type: 'Point',
            coordinates: coord,
          },
        });
      });
    }

    return { type: 'FeatureCollection', features };
  }, [partialCoords, drawingMode]);

  // Initialize sources and layers
  useEffect(() => {
    if (!map) return;

    const setupLayers = () => {
      // Check if layers already exist (may have been left from previous session)
      const needsSetup = !map.getSource(SOURCE_ID);
      
      if (needsSetup) {
        // Add main features source
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Polygon fill layer
        map.addLayer({
          id: LAYER_POLYGONS_FILL,
          type: 'fill',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': ['get', 'fillOpacity'],
          },
        });

        // Polygon stroke layer
        map.addLayer({
          id: LAYER_POLYGONS_STROKE,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['get', 'selected'], ['+', ['max', ['get', 'strokeWidth'], 2], 2],
              ['max', ['get', 'strokeWidth'], 2]
            ],
            'line-opacity': ['get', 'opacity'],
          },
        });

        // Lines layer - ensure minimum width of 2 and selected adds +2
        map.addLayer({
          id: LAYER_LINES,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['get', 'selected'], ['+', ['max', ['get', 'strokeWidth'], 2], 2],
              ['max', ['get', 'strokeWidth'], 2]
            ],
            'line-opacity': ['get', 'opacity'],
          },
        });

        // Points layer
        map.addLayer({
          id: LAYER_POINTS,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': [
              'case',
              ['get', 'selected'], 10,
              8
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'opacity'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      
      sourceAddedRef.current = true;

      // Add preview source for drawing (if not exists)
      if (!map.getSource(PREVIEW_SOURCE_ID)) {
        map.addSource(PREVIEW_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Preview layer - dashed line for work in progress
        map.addLayer({
          id: LAYER_PREVIEW,
          type: 'line',
          source: PREVIEW_SOURCE_ID,
          filter: ['any', 
            ['==', ['get', 'type'], 'preview-line'],
            ['==', ['geometry-type'], 'Polygon']
          ],
          paint: {
            'line-color': '#3B82F6',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });

        // Preview points
        map.addLayer({
          id: `${LAYER_PREVIEW}-points`,
          type: 'circle',
          source: PREVIEW_SOURCE_ID,
          filter: ['==', ['get', 'type'], 'preview-point'],
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'isFirst'], true], 8,
              6
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'isFirst'], true], '#22C55E',
              '#3B82F6'
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      
      previewSourceAddedRef.current = true;
      
      // Ensure layers are visible (they may have been hidden)
      const allLayers = [LAYER_POLYGONS_FILL, LAYER_POLYGONS_STROKE, LAYER_LINES, LAYER_POINTS, LAYER_PREVIEW, `${LAYER_PREVIEW}-points`];
      allLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      });
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }
    
    // Re-setup on style changes (layer switching)
    const handleStyleLoad = () => {
      sourceAddedRef.current = false;
      previewSourceAddedRef.current = false;
      setupLayers();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      
      // DON'T clean up layers on unmount - they should persist on the shared map
      // Just hide them instead so they can be shown again when returning to editor
      if (map && map.getStyle()) {
        try {
          const allLayers = [LAYER_POLYGONS_FILL, LAYER_POLYGONS_STROKE, LAYER_LINES, LAYER_POINTS, LAYER_PREVIEW, `${LAYER_PREVIEW}-points`];
          allLayers.forEach(layerId => {
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'none');
            }
          });
        } catch (e) {
          // Ignore errors
        }
      }
      sourceAddedRef.current = false;
      previewSourceAddedRef.current = false;
    };
  }, [map]);

  // Update features data (filter out feature being edited geometrically and hidden features)
  useEffect(() => {
    if (!map || !sourceAddedRef.current) return;

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) {
      // Hide the feature being edited (it's rendered by vertex markers instead)
      // Also hide features that are toggled off in the feature list
      const renderableFeatures = features.filter(f => 
        f.id !== editingGeometryFeatureId && !hiddenFeatureIds.has(f.id)
      );
      source.setData(toGeoJSON(renderableFeatures));
    }
  }, [map, features, toGeoJSON, editingGeometryFeatureId, hiddenFeatureIds]);

  // Update preview data
  useEffect(() => {
    if (!map || !previewSourceAddedRef.current) return;

    const source = map.getSource(PREVIEW_SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(createPreviewGeoJSON());
    }
  }, [map, createPreviewGeoJSON]);

  // Handle feature click for selection
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      // Query features at click point
      const clickedFeatures = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_POINTS, LAYER_LINES, LAYER_POLYGONS_FILL],
      });

      if (clickedFeatures.length > 0 && clickedFeatures[0].properties?.id) {
        onFeatureClick(clickedFeatures[0].properties.id);
      }
    };

    // Only allow feature selection when not drawing
    const wrappedClick = (e: mapboxgl.MapMouseEvent) => {
      if (drawingMode === 'none') {
        handleClick(e);
      }
    };

    map.on('click', LAYER_POINTS, wrappedClick);
    map.on('click', LAYER_LINES, wrappedClick);
    map.on('click', LAYER_POLYGONS_FILL, wrappedClick);

    // Change cursor on hover
    const setCursor = () => {
      if (drawingMode === 'none') {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const resetCursor = () => {
      if (drawingMode === 'none') {
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mouseenter', LAYER_POINTS, setCursor);
    map.on('mouseenter', LAYER_LINES, setCursor);
    map.on('mouseenter', LAYER_POLYGONS_FILL, setCursor);
    map.on('mouseleave', LAYER_POINTS, resetCursor);
    map.on('mouseleave', LAYER_LINES, resetCursor);
    map.on('mouseleave', LAYER_POLYGONS_FILL, resetCursor);

    return () => {
      map.off('click', LAYER_POINTS, wrappedClick);
      map.off('click', LAYER_LINES, wrappedClick);
      map.off('click', LAYER_POLYGONS_FILL, wrappedClick);
      map.off('mouseenter', LAYER_POINTS, setCursor);
      map.off('mouseenter', LAYER_LINES, setCursor);
      map.off('mouseenter', LAYER_POLYGONS_FILL, setCursor);
      map.off('mouseleave', LAYER_POINTS, resetCursor);
      map.off('mouseleave', LAYER_LINES, resetCursor);
      map.off('mouseleave', LAYER_POLYGONS_FILL, resetCursor);
    };
  }, [map, drawingMode, onFeatureClick]);
}
