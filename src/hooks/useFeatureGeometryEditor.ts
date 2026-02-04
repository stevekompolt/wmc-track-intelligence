// Hook for editing feature geometry with draggable vertex markers

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { VenueFeature, FeatureGeometry } from '@/types/feature';

interface UseFeatureGeometryEditorOptions {
  map: mapboxgl.Map | null;
  feature: VenueFeature | null;
  isEditing: boolean;
  onGeometryUpdate: (geometry: FeatureGeometry) => void;
}

interface VertexMarker {
  marker: mapboxgl.Marker;
  index: number;
  type: 'vertex' | 'midpoint';
}

// Colors for vertex markers
const VERTEX_COLOR = '#3B82F6';
const MIDPOINT_COLOR = 'rgba(59, 130, 246, 0.5)';

// Editing preview layer IDs
const EDITING_SOURCE_ID = 'geometry-editing-preview';
const EDITING_FILL_LAYER = 'geometry-editing-fill';
const EDITING_STROKE_LAYER = 'geometry-editing-stroke';

// Create a vertex marker element
function createVertexElement(type: 'vertex' | 'midpoint'): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = type === 'vertex' ? '12px' : '8px';
  el.style.height = type === 'vertex' ? '12px' : '8px';
  el.style.backgroundColor = type === 'vertex' ? VERTEX_COLOR : MIDPOINT_COLOR;
  el.style.border = type === 'vertex' ? '2px solid white' : '1px dashed white';
  el.style.borderRadius = '50%';
  el.style.cursor = type === 'vertex' ? 'move' : 'pointer';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  return el;
}

export function useFeatureGeometryEditor({
  map,
  feature,
  isEditing,
  onGeometryUpdate,
}: UseFeatureGeometryEditorOptions): void {
  const markersRef = useRef<VertexMarker[]>([]);
  const isDraggingRef = useRef(false);
  const onGeometryUpdateRef = useRef(onGeometryUpdate);
  const editingLayersAddedRef = useRef(false);
  
  // Keep callback ref updated
  onGeometryUpdateRef.current = onGeometryUpdate;

  // Get coordinates array from feature geometry
  const getCoordinates = useCallback((geom: FeatureGeometry): [number, number][] => {
    if (geom.type === 'Point') {
      return [geom.coordinates];
    } else if (geom.type === 'LineString') {
      return geom.coordinates;
    } else if (geom.type === 'Polygon') {
      // Return all but the closing point (which duplicates the first)
      return geom.coordinates[0].slice(0, -1);
    }
    return [];
  }, []);

  // Build new geometry from coordinates
  const buildGeometry = useCallback((
    type: VenueFeature['type'],
    coords: [number, number][]
  ): FeatureGeometry => {
    if (type === 'point') {
      return { type: 'Point', coordinates: coords[0] };
    } else if (type === 'line') {
      return { type: 'LineString', coordinates: coords };
    } else {
      // Close the polygon ring
      return { type: 'Polygon', coordinates: [[...coords, coords[0]]] };
    }
  }, []);

  // Calculate midpoint between two coordinates
  const getMidpoint = (a: [number, number], b: [number, number]): [number, number] => {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };

  // Convert feature to GeoJSON for preview layer
  const featureToGeoJSON = useCallback((feat: VenueFeature): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: feat.geometry as GeoJSON.Geometry,
      }],
    };
  }, []);

  // Add editing preview layers
  const addEditingLayers = useCallback(() => {
    if (!map || !feature || editingLayersAddedRef.current) return;

    // Add source
    if (!map.getSource(EDITING_SOURCE_ID)) {
      map.addSource(EDITING_SOURCE_ID, {
        type: 'geojson',
        data: featureToGeoJSON(feature),
      });
    }

    // Add fill layer for polygons
    if (!map.getLayer(EDITING_FILL_LAYER)) {
      map.addLayer({
        id: EDITING_FILL_LAYER,
        type: 'fill',
        source: EDITING_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': feature.style.fillColor,
          'fill-opacity': feature.style.fillOpacity,
        },
      });
    }

    // Add stroke layer for lines and polygons
    if (!map.getLayer(EDITING_STROKE_LAYER)) {
      map.addLayer({
        id: EDITING_STROKE_LAYER,
        type: 'line',
        source: EDITING_SOURCE_ID,
        filter: ['any',
          ['==', ['geometry-type'], 'Polygon'],
          ['==', ['geometry-type'], 'LineString']
        ],
        paint: {
          'line-color': feature.style.color,
          'line-width': feature.style.strokeWidth,
          'line-opacity': feature.style.opacity,
        },
      });
    }

    editingLayersAddedRef.current = true;
  }, [map, feature, featureToGeoJSON]);

  // Remove editing preview layers
  const removeEditingLayers = useCallback(() => {
    if (!map) return;

    try {
      if (map.getLayer(EDITING_STROKE_LAYER)) map.removeLayer(EDITING_STROKE_LAYER);
      if (map.getLayer(EDITING_FILL_LAYER)) map.removeLayer(EDITING_FILL_LAYER);
      if (map.getSource(EDITING_SOURCE_ID)) map.removeSource(EDITING_SOURCE_ID);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    editingLayersAddedRef.current = false;
  }, [map]);

  // Update editing preview source data
  const updateEditingSource = useCallback((geometry: FeatureGeometry) => {
    if (!map || !editingLayersAddedRef.current) return;

    const source = map.getSource(EDITING_SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: geometry as GeoJSON.Geometry,
        }],
      });
    }
  }, [map]);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];
  }, []);

  // Create markers for editing
  const createMarkers = useCallback(() => {
    if (!map || !feature) return;

    const coords = getCoordinates(feature.geometry);
    const newMarkers: VertexMarker[] = [];

    // Create vertex markers
    coords.forEach((coord, index) => {
      const el = createVertexElement('vertex');
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(coord)
        .addTo(map);

      // Handle drag
      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('drag', () => {
        const lngLat = marker.getLngLat();
        const updatedCoords = [...coords];
        updatedCoords[index] = [lngLat.lng, lngLat.lat];
        
        // Update geometry in real-time
        const newGeometry = buildGeometry(feature.type, updatedCoords);
        onGeometryUpdateRef.current(newGeometry);
        
        // Also update the editing preview layer
        updateEditingSource(newGeometry);
      });

      marker.on('dragend', () => {
        isDraggingRef.current = false;
      });

      newMarkers.push({ marker, index, type: 'vertex' });
    });

    // Create midpoint markers for lines and polygons (to add new vertices)
    if (feature.type !== 'point' && coords.length >= 2) {
      const segments = feature.type === 'polygon' 
        ? coords.length // Include segment from last to first
        : coords.length - 1;

      for (let i = 0; i < segments; i++) {
        const nextIndex = (i + 1) % coords.length;
        const midCoord = getMidpoint(coords[i], coords[nextIndex]);
        
        const el = createVertexElement('midpoint');
        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat(midCoord)
          .addTo(map);

        // On drag, insert a new vertex
        marker.on('dragstart', () => {
          isDraggingRef.current = true;
          // Convert midpoint to full vertex
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.backgroundColor = VERTEX_COLOR;
          el.style.border = '2px solid white';
          el.style.cursor = 'move';
        });

        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          
          // Insert new vertex after index i (preview during drag)
          const updatedCoords = [...coords];
          updatedCoords.splice(i + 1, 0, [lngLat.lng, lngLat.lat]);
          
          const newGeometry = buildGeometry(feature.type, updatedCoords);
          updateEditingSource(newGeometry);
        });

        marker.on('dragend', () => {
          isDraggingRef.current = false;
          const lngLat = marker.getLngLat();
          
          // Insert new vertex after index i
          const updatedCoords = [...coords];
          updatedCoords.splice(i + 1, 0, [lngLat.lng, lngLat.lat]);
          
          const newGeometry = buildGeometry(feature.type, updatedCoords);
          onGeometryUpdateRef.current(newGeometry);
        });

        newMarkers.push({ marker, index: i, type: 'midpoint' });
      }
    }

    markersRef.current = newMarkers;
  }, [map, feature, getCoordinates, buildGeometry, updateEditingSource]);

  // Track feature ID to detect when we switch features vs just feature updates
  const currentFeatureIdRef = useRef<string | null>(null);

  // Create/remove markers and editing layers when editing state changes
  useEffect(() => {
    if (!isEditing || !map || !feature) {
      clearMarkers();
      removeEditingLayers();
      currentFeatureIdRef.current = null;
      return;
    }

    // Only do full cleanup and recreation when feature ID changes or starting editing
    const featureChanged = currentFeatureIdRef.current !== feature.id;
    currentFeatureIdRef.current = feature.id;

    if (!featureChanged && editingLayersAddedRef.current) {
      // Feature reference changed but same ID - just update source data
      updateEditingSource(feature.geometry);
      return;
    }

    // Full cleanup before creating new layers
    clearMarkers();
    removeEditingLayers();

    // Inline layer creation
    const createLayersAndMarkers = () => {
      if (editingLayersAddedRef.current) return;

      try {
        // Add source with current feature data
        if (!map.getSource(EDITING_SOURCE_ID)) {
          map.addSource(EDITING_SOURCE_ID, {
            type: 'geojson',
            data: featureToGeoJSON(feature),
          });
        } else {
          const source = map.getSource(EDITING_SOURCE_ID) as mapboxgl.GeoJSONSource;
          source.setData(featureToGeoJSON(feature));
        }

        // Add fill layer for polygons
        if (!map.getLayer(EDITING_FILL_LAYER)) {
          map.addLayer({
            id: EDITING_FILL_LAYER,
            type: 'fill',
            source: EDITING_SOURCE_ID,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: {
              'fill-color': feature.style.fillColor,
              'fill-opacity': feature.style.fillOpacity,
            },
          });
        }

        // Add stroke layer for lines and polygons - ensure minimum width
        if (!map.getLayer(EDITING_STROKE_LAYER)) {
          const lineWidth = Math.max(feature.style.strokeWidth, 3);
          map.addLayer({
            id: EDITING_STROKE_LAYER,
            type: 'line',
            source: EDITING_SOURCE_ID,
            filter: ['any',
              ['==', ['geometry-type'], 'Polygon'],
              ['==', ['geometry-type'], 'LineString']
            ],
            paint: {
              'line-color': feature.style.color,
              'line-width': lineWidth,
              'line-opacity': feature.style.opacity,
            },
          });
        }

        editingLayersAddedRef.current = true;
        
        // Create markers after layers are ready
        createMarkers();
      } catch (e) {
        console.error('Error creating editing layers:', e);
      }
    };

    // Add editing preview layers first, then markers on top
    if (map.isStyleLoaded()) {
      createLayersAndMarkers();
    } else {
      map.once('style.load', createLayersAndMarkers);
    }

    return () => {
      clearMarkers();
      removeEditingLayers();
      currentFeatureIdRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, map, feature?.id, clearMarkers, createMarkers, removeEditingLayers, featureToGeoJSON, updateEditingSource]);

  // Update marker positions when geometry changes (but not during drag)
  useEffect(() => {
    if (!isEditing || !feature || isDraggingRef.current) return;

    const coords = getCoordinates(feature.geometry);
    
    // Update vertex marker positions
    markersRef.current.forEach(({ marker, index, type }) => {
      if (type === 'vertex' && coords[index]) {
        marker.setLngLat(coords[index]);
      }
    });
    
    // Also update the editing source
    updateEditingSource(feature.geometry);
    
    // Midpoints need full recreation when coords change, handled by feature?.id dep
  }, [feature?.geometry, isEditing, getCoordinates, updateEditingSource]);
}
