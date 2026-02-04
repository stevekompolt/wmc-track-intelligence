// Read-only feature renderer for shared map layer with mode-aware visibility
// This renderer shows features in all views, filtering by mode visibility flags

import { useEffect, useRef, useCallback } from 'react';
import type { VenueFeature } from '@/types/feature';
import type { AppMode } from '@/types/viewpoint';
import mapboxgl from 'mapbox-gl';

interface UseSharedFeatureRendererOptions {
  map: mapboxgl.Map | null;
  features: VenueFeature[];
  currentMode: AppMode;
}

// Use unique prefixes to avoid conflicts with editor-specific layers
const SHARED_SOURCE_ID = 'shared-venue-features';
const SHARED_LAYER_POLYGONS_FILL = 'shared-feature-polygons-fill';
const SHARED_LAYER_POLYGONS_STROKE = 'shared-feature-polygons-stroke';
const SHARED_LAYER_LINES = 'shared-feature-lines';
const SHARED_LAYER_POINTS = 'shared-feature-points';

export function useSharedFeatureRenderer({
  map,
  features,
  currentMode,
}: UseSharedFeatureRendererOptions): void {
  const sourceAddedRef = useRef(false);
  const cleanupDoneRef = useRef(false);

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

  // Initialize source and layers - includes features and currentMode in deps to ensure sync
  useEffect(() => {
    if (!map) return;
    
    cleanupDoneRef.current = false;
    
    const layers = [
      SHARED_LAYER_POLYGONS_FILL,
      SHARED_LAYER_POLYGONS_STROKE,
      SHARED_LAYER_LINES,
      SHARED_LAYER_POINTS,
    ];

    const setupLayers = () => {
      // Check if source already exists
      const sourceExists = !!map.getSource(SHARED_SOURCE_ID);
      
      if (!sourceExists) {
        map.addSource(SHARED_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Polygon fill layer
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

        // Polygon stroke layer
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

        // Lines layer
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

        // Points layer
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
      
      // CRITICAL: Immediately update source data after confirming source exists
      // This fixes the race condition where data effect ran before source was ready
      const source = map.getSource(SHARED_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(toGeoJSON(features));
      }
      
      // Set visibility based on current mode - editor has its own layers
      const visibility = currentMode === 'editor' ? 'none' : 'visible';
      layers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }
    
    // Also re-setup on style changes (layer switching)
    const handleStyleLoad = () => {
      sourceAddedRef.current = false;
      setupLayers();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      
      // DON'T remove layers on cleanup - just hide them
      // SharedMapContainer stays mounted, so cleanup only runs on unmount
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;
      
      if (map && map.getStyle()) {
        try {
          layers.forEach(layerId => {
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'none');
            }
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      sourceAddedRef.current = false;
    };
  }, [map, features, currentMode, toGeoJSON]);

  // Note: Data updates and visibility toggling are now handled in setupLayers
  // to prevent race conditions between setup and data effects
}
