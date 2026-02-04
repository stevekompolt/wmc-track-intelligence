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
  }, [map, feature, getCoordinates, buildGeometry, clearMarkers]);

  // Create/remove markers when editing state changes
  useEffect(() => {
    if (isEditing && map && feature) {
      clearMarkers();
      createMarkers();
    } else {
      clearMarkers();
    }

    return () => {
      clearMarkers();
    };
  }, [isEditing, map, feature?.id, clearMarkers, createMarkers]);

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
    
    // Midpoints need full recreation when coords change, handled by feature?.id dep
  }, [feature?.geometry, isEditing, getCoordinates]);
}
