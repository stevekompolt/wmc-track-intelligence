// Read-only feature and overlay renderer for shared map layer with mode-aware visibility
// This renderer shows features and overlays in all views, filtering by mode visibility flags

import { useEffect, useRef, useCallback } from 'react';
import type { VenueFeature } from '@/types/feature';
import type { MapOverlay } from '@/types/overlay';
import type { AppMode } from '@/types/viewpoint';
import mapboxgl from 'mapbox-gl';

interface UseSharedFeatureRendererOptions {
  map: mapboxgl.Map | null;
  features: VenueFeature[];
  overlays?: MapOverlay[];
  currentMode: AppMode;
}

// Use unique prefixes to avoid conflicts with editor-specific layers
const SHARED_SOURCE_ID = 'shared-venue-features';
const SHARED_LAYER_POLYGONS_FILL = 'shared-feature-polygons-fill';
const SHARED_LAYER_POLYGONS_STROKE = 'shared-feature-polygons-stroke';
const SHARED_LAYER_LINES = 'shared-feature-lines';
const SHARED_LAYER_POINTS = 'shared-feature-points';

// Overlay source/layer ID generators
const getOverlaySourceId = (overlayId: string) => `shared-overlay-${overlayId}`;
const getOverlayLayerId = (overlayId: string) => `shared-overlay-layer-${overlayId}`;

export function useSharedFeatureRenderer({
  map,
  features,
  overlays = [],
  currentMode,
}: UseSharedFeatureRendererOptions): void {
  const sourceAddedRef = useRef(false);
  const cleanupDoneRef = useRef(false);
  const renderedOverlayIdsRef = useRef<Set<string>>(new Set());

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
        },
        geometry: f.geometry as GeoJSON.Geometry,
      })),
    };
  }, []);

  // Filter overlays by mode visibility
  const getVisibleOverlays = useCallback((overlayList: MapOverlay[], mode: AppMode): MapOverlay[] => {
    switch (mode) {
      case 'editor':
        return []; // Editor has its own overlay renderer
      case 'fan':
        return overlayList.filter(o => o.visibleToFans && o.imageUrl);
      case 'media':
        return overlayList.filter(o => o.visibleToMedia && o.imageUrl);
      case 'ops':
        return overlayList.filter(o => o.visibleToOps && o.imageUrl);
      default:
        return [];
    }
  }, []);

  // Add/update overlay layer
  const updateOverlayLayer = useCallback((overlay: MapOverlay) => {
    if (!map || !overlay.imageUrl) return;

    const { north, south, east, west } = overlay.boundingBox;
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) return;

    const sourceId = getOverlaySourceId(overlay.id);
    const layerId = getOverlayLayerId(overlay.id);

    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ];

    const source = map.getSource(sourceId) as mapboxgl.ImageSource;
    
    if (source) {
      source.updateImage({
        url: overlay.imageUrl,
        coordinates,
      });
    } else {
      map.addSource(sourceId, {
        type: 'image',
        url: overlay.imageUrl,
        coordinates,
      });

      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': overlay.opacity,
          'raster-fade-duration': 0,
        },
      });
      
      renderedOverlayIdsRef.current.add(overlay.id);
    }

    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', overlay.opacity);
    }
  }, [map]);

  // Remove overlay layer
  const removeOverlayLayer = useCallback((overlayId: string) => {
    if (!map) return;
    
    const sourceId = getOverlaySourceId(overlayId);
    const layerId = getOverlayLayerId(overlayId);
    
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    
    renderedOverlayIdsRef.current.delete(overlayId);
  }, [map]);

  // Initialize source and layers
  useEffect(() => {
    if (!map) return;
    
    cleanupDoneRef.current = false;
    
    const featureLayers = [
      SHARED_LAYER_POLYGONS_FILL,
      SHARED_LAYER_POLYGONS_STROKE,
      SHARED_LAYER_LINES,
      SHARED_LAYER_POINTS,
    ];

    const setupLayers = () => {
      // Setup feature layers
      const sourceExists = !!map.getSource(SHARED_SOURCE_ID);
      
      if (!sourceExists) {
        map.addSource(SHARED_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: SHARED_LAYER_POLYGONS_FILL,
          type: 'fill',
          source: SHARED_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': ['get', 'fillOpacity'],
          },
        });

        map.addLayer({
          id: SHARED_LAYER_POLYGONS_STROKE,
          type: 'line',
          source: SHARED_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'strokeWidth'],
            'line-opacity': ['get', 'opacity'],
          },
        });

        map.addLayer({
          id: SHARED_LAYER_LINES,
          type: 'line',
          source: SHARED_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'strokeWidth'],
            'line-opacity': ['get', 'opacity'],
          },
        });

        map.addLayer({
          id: SHARED_LAYER_POINTS,
          type: 'circle',
          source: SHARED_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'opacity'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      
      sourceAddedRef.current = true;
      
      // Update feature source data
      const source = map.getSource(SHARED_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(toGeoJSON(features));
      }
      
      // Set feature layer visibility based on mode
      const visibility = currentMode === 'editor' ? 'none' : 'visible';
      featureLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });

      // Setup overlay layers for non-editor modes
      const visibleOverlays = getVisibleOverlays(overlays, currentMode);
      const visibleIds = new Set(visibleOverlays.map(o => o.id));
      
      // Remove overlays no longer visible
      renderedOverlayIdsRef.current.forEach(id => {
        if (!visibleIds.has(id)) {
          removeOverlayLayer(id);
        }
      });
      
      // Add/update visible overlays
      visibleOverlays.forEach(overlay => {
        updateOverlayLayer(overlay);
      });
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }
    
    const handleStyleLoad = () => {
      sourceAddedRef.current = false;
      renderedOverlayIdsRef.current.clear();
      setupLayers();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;
      
      // Check map is valid and style is loaded before cleanup
      if (map && map.isStyleLoaded()) {
        try {
          featureLayers.forEach(layerId => {
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'none');
            }
          });
        } catch (e) {
          // Ignore cleanup errors during map destruction
        }
      }
      sourceAddedRef.current = false;
    };
  }, [map, features, overlays, currentMode, toGeoJSON, getVisibleOverlays, updateOverlayLayer, removeOverlayLayer]);
}
