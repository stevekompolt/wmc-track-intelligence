// Hook for editing feature geometry with draggable vertex markers

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { VenueFeature, FeatureGeometry } from '@/types/feature';
import {
  getPolygonParts,
  replacePolygonPart,
  type Ring,
} from '@/lib/polygonParts';

interface UseFeatureGeometryEditorOptions {
  map: mapboxgl.Map | null;
  feature: VenueFeature | null;
  isEditing: boolean;
  onGeometryUpdate: (geometry: FeatureGeometry) => void;
}

interface VertexMarker {
  marker: mapboxgl.Marker;
  index: number;
  partIndex: number;
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
  const currentFeatureIdRef = useRef<string | null>(null);
  
  // Keep callback ref updated
  onGeometryUpdateRef.current = onGeometryUpdate;

  // Open (non-closed) coordinate rings, one per part. Points and lines always
  // have a single part; polygons may have several.
  const getParts = useCallback((geom: FeatureGeometry): Ring[] => {
    if (geom.type === 'Point') {
      return [[geom.coordinates]];
    }
    if (geom.type === 'LineString') {
      return [geom.coordinates];
    }
    return getPolygonParts(geom).map((ring) => {
      if (ring.length < 2) return ring;
      const first = ring[0];
      const last = ring[ring.length - 1];
      const closed = first[0] === last[0] && first[1] === last[1];
      return closed ? ring.slice(0, -1) : ring;
    });
  }, []);

  // Rebuild geometry with a single part replaced
  const buildGeometry = useCallback((
    feat: VenueFeature,
    partIndex: number,
    coords: Ring
  ): FeatureGeometry => {
    if (feat.type === 'point') {
      return { type: 'Point', coordinates: coords[0] };
    }
    if (feat.type === 'line') {
      return { type: 'LineString', coordinates: coords };
    }
    return replacePolygonPart(feat.geometry, partIndex, coords);
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

  // Create markers for the current feature (all parts)
  const createMarkersForFeature = useCallback((feat: VenueFeature) => {
    if (!map) return;

    const parts = getParts(feat.geometry);
    const newMarkers: VertexMarker[] = [];

    parts.forEach((coords, partIndex) => {
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
        const updatedCoords = [...(getParts(feat.geometry)[partIndex] ?? coords)];
        updatedCoords[index] = [lngLat.lng, lngLat.lat];
        
        // Update geometry in real-time
        const newGeometry = buildGeometry(feat, partIndex, updatedCoords);
        onGeometryUpdateRef.current(newGeometry);
      });

      marker.on('dragend', () => {
        isDraggingRef.current = false;
      });

      newMarkers.push({ marker, index, partIndex, type: 'vertex' });
    });

    // Create midpoint markers for lines and polygons (to add new vertices)
    if (feat.type !== 'point' && coords.length >= 2) {
      const segments = feat.type === 'polygon' 
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
          const updatedCoords = [...(getParts(feat.geometry)[partIndex] ?? coords)];
          updatedCoords.splice(i + 1, 0, [lngLat.lng, lngLat.lat]);
          
          const newGeometry = buildGeometry(feat, partIndex, updatedCoords);
          onGeometryUpdateRef.current(newGeometry);
        });

        marker.on('dragend', () => {
          isDraggingRef.current = false;
          const lngLat = marker.getLngLat();
          // Insert new vertex after index i
          const updatedCoords = [...(getParts(feat.geometry)[partIndex] ?? coords)];
          updatedCoords.splice(i + 1, 0, [lngLat.lng, lngLat.lat]);
          
          const newGeometry = buildGeometry(feat, partIndex, updatedCoords);
          onGeometryUpdateRef.current(newGeometry);
        });

        newMarkers.push({ marker, index: i, partIndex, type: 'midpoint' });
      }
    }
    });

    markersRef.current = newMarkers;
  }, [map, getParts, buildGeometry]);

  // Main effect: create/remove markers when editing state or feature ID changes
  useEffect(() => {
    // If not editing or no feature, cleanup and exit
    if (!isEditing || !map || !feature) {
      if (currentFeatureIdRef.current !== null) {
        clearMarkers();
        currentFeatureIdRef.current = null;
      }
      return;
    }

    // Only recreate markers when feature ID actually changes
    const featureIdChanged = currentFeatureIdRef.current !== feature.id;
    
    if (featureIdChanged) {
      // New feature - clear old markers and create new ones
      clearMarkers();
      currentFeatureIdRef.current = feature.id;
      
      const createMarkers = () => {
        createMarkersForFeature(feature);
      };
      
      if (map.isStyleLoaded()) {
        createMarkers();
      } else {
        map.once('style.load', createMarkers);
      }
    }
    
    // Note: We don't return a cleanup function here because we only want
    // to clean up when isEditing becomes false or feature changes (handled above)
  }, [isEditing, map, feature?.id, clearMarkers, createMarkersForFeature]);

  // Update marker positions when geometry changes (but not during drag)
  // This keeps markers in sync with geometry updates from the renderer
  useEffect(() => {
    if (!isEditing || !feature || isDraggingRef.current) return;
    if (currentFeatureIdRef.current !== feature.id) return; // Skip if feature ID doesn't match

    const parts = getParts(feature.geometry);
    
    // Update vertex marker positions using setLngLat (no recreation)
    markersRef.current.forEach(({ marker, index, partIndex, type }) => {
      const coord = parts[partIndex]?.[index];
      if (type === 'vertex' && coord) {
        marker.setLngLat(coord);
      }
    });
    
    // Note: Midpoints would need full recreation when vertex count changes,
    // but that's handled by the midpoint drag creating a new geometry with more vertices
  }, [feature?.geometry, isEditing, getParts, feature?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
      currentFeatureIdRef.current = null;
    };
  }, [clearMarkers]);
}
