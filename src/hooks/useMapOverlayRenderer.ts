import { useEffect, useRef, useCallback } from 'react';
import mapboxgl, { Marker, LngLatLike } from 'mapbox-gl';
import type { MapOverlay, CornerHandle, BoundingBox } from '@/types/overlay';

interface UseMapOverlayRendererOptions {
  map: mapboxgl.Map | null;
  overlay: MapOverlay | null;
  dragMode: 'none' | 'corners' | 'move';
  ghostBounds?: BoundingBox | null;
  onCornerDrag: (corner: CornerHandle, lat: number, lng: number) => void;
  onMoveDrag: (deltaLat: number, deltaLng: number) => void;
}

const CORNER_MARKER_STYLE = `
  width: 16px;
  height: 16px;
  background: hsl(var(--primary));
  border: 2px solid hsl(var(--background));
  border-radius: 50%;
  cursor: nwse-resize;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
`;

const CENTER_MARKER_STYLE = `
  width: 20px;
  height: 20px;
  background: hsl(var(--primary));
  border: 2px solid hsl(var(--background));
  border-radius: 4px;
  cursor: move;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
`;

export function useMapOverlayRenderer({
  map,
  overlay,
  dragMode,
  ghostBounds,
  onCornerDrag,
  onMoveDrag,
}: UseMapOverlayRendererOptions) {
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const sourceId = 'overlay-image';
  const layerId = 'overlay-layer';
  const ghostSourceId = 'overlay-ghost';
  const ghostLayerId = 'overlay-ghost-layer';
  const dragStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  // Store callback refs to avoid recreating markers when callbacks change
  const onCornerDragRef = useRef(onCornerDrag);
  onCornerDragRef.current = onCornerDrag;
  
  const onMoveDragRef = useRef(onMoveDrag);
  onMoveDragRef.current = onMoveDrag;

  // Add/update overlay image source and layer
  const updateOverlayLayer = useCallback(() => {
    if (!map || !overlay || !overlay.imageUrl) return;

    const { north, south, east, west } = overlay.boundingBox;
    
    // Allow rendering even with zero bounds (will be invisible until positioned)
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) return;

    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [west, north], // top-left
      [east, north], // top-right
      [east, south], // bottom-right
      [west, south], // bottom-left
    ];

    const source = map.getSource(sourceId) as mapboxgl.ImageSource;
    
    if (source) {
      // Update existing source
      source.updateImage({
        url: overlay.imageUrl,
        coordinates,
      });
    } else {
      // Add new source and layer
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
    }

    // Update opacity
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', overlay.opacity);
    }
  }, [map, overlay]);

  // Add/update ghost preview layer
  const updateGhostLayer = useCallback(() => {
    if (!map || !overlay?.imageUrl) {
      // Remove ghost layer if exists
      if (map) {
        if (map.getLayer(ghostLayerId)) {
          map.removeLayer(ghostLayerId);
        }
        if (map.getSource(ghostSourceId)) {
          map.removeSource(ghostSourceId);
        }
      }
      return;
    }

    if (!ghostBounds) {
      // Remove ghost layer
      if (map.getLayer(ghostLayerId)) {
        map.removeLayer(ghostLayerId);
      }
      if (map.getSource(ghostSourceId)) {
        map.removeSource(ghostSourceId);
      }
      return;
    }

    const { north, south, east, west } = ghostBounds;
    
    if (north <= south || east <= west) return;

    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ];

    const source = map.getSource(ghostSourceId) as mapboxgl.ImageSource;
    
    if (source) {
      source.updateImage({
        url: overlay.imageUrl,
        coordinates,
      });
    } else {
      map.addSource(ghostSourceId, {
        type: 'image',
        url: overlay.imageUrl,
        coordinates,
      });

      map.addLayer({
        id: ghostLayerId,
        type: 'raster',
        source: ghostSourceId,
        paint: {
          'raster-opacity': 0.5,
          'raster-fade-duration': 200,
        },
      });
    }
  }, [map, overlay?.imageUrl, ghostBounds]);

  // Create corner markers - only called when drag mode changes
  const createCornerMarker = useCallback((
    corner: CornerHandle,
    lngLat: LngLatLike,
    cursor: string
  ): Marker => {
    const el = document.createElement('div');
    el.style.cssText = CORNER_MARKER_STYLE;
    el.style.cursor = cursor;
    el.setAttribute('data-corner', corner);

    const marker = new mapboxgl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat(lngLat);

    marker.on('dragstart', () => {
      isDraggingRef.current = true;
    });

    marker.on('drag', () => {
      const pos = marker.getLngLat();
      onCornerDragRef.current(corner, pos.lat, pos.lng);
    });

    marker.on('dragend', () => {
      isDraggingRef.current = false;
    });

    return marker;
  }, []);

  // Create center marker for moving - only called when drag mode changes
  const createCenterMarker = useCallback((lngLat: LngLatLike): Marker => {
    const el = document.createElement('div');
    el.style.cssText = CENTER_MARKER_STYLE;
    el.setAttribute('data-role', 'center');

    const marker = new mapboxgl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat(lngLat);

    marker.on('dragstart', () => {
      isDraggingRef.current = true;
      dragStartRef.current = marker.getLngLat();
    });

    marker.on('drag', () => {
      if (!dragStartRef.current) return;
      const pos = marker.getLngLat();
      const deltaLat = pos.lat - dragStartRef.current.lat;
      const deltaLng = pos.lng - dragStartRef.current.lng;
      onMoveDragRef.current(deltaLat, deltaLng);
      dragStartRef.current = pos;
    });

    marker.on('dragend', () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
    });

    return marker;
  }, []);

  // Create markers - only when drag mode or lock status changes
  const createMarkers = useCallback(() => {
    if (!map || !overlay) {
      // Remove all markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      return;
    }

    const { north, south, east, west } = overlay.boundingBox;
    
    // Check if bounds are valid for showing markers
    const hasValidBounds = north > south && east > west;
    
    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    if (!hasValidBounds) return;

    if (dragMode === 'corners' && !overlay.isLocked) {
      // Add corner markers
      const corners: { id: CornerHandle; lng: number; lat: number; cursor: string }[] = [
        { id: 'nw', lng: west, lat: north, cursor: 'nwse-resize' },
        { id: 'ne', lng: east, lat: north, cursor: 'nesw-resize' },
        { id: 'sw', lng: west, lat: south, cursor: 'nesw-resize' },
        { id: 'se', lng: east, lat: south, cursor: 'nwse-resize' },
      ];

      corners.forEach(({ id, lng, lat, cursor }) => {
        const marker = createCornerMarker(id, [lng, lat], cursor);
        marker.addTo(map);
        markersRef.current.set(id, marker);
      });
    } else if (dragMode === 'move' && !overlay.isLocked) {
      // Add center marker
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      const marker = createCenterMarker([centerLng, centerLat]);
      marker.addTo(map);
      markersRef.current.set('center', marker);
    }
  }, [map, dragMode, overlay?.isLocked, overlay?.boundingBox, createCornerMarker, createCenterMarker]);

  // Update marker positions without recreating them - used during drag
  const updateMarkerPositions = useCallback(() => {
    if (!overlay || isDraggingRef.current) return;
    
    const { north, south, east, west } = overlay.boundingBox;
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) return;

    // Update corner markers if they exist
    markersRef.current.get('nw')?.setLngLat([west, north]);
    markersRef.current.get('ne')?.setLngLat([east, north]);
    markersRef.current.get('sw')?.setLngLat([west, south]);
    markersRef.current.get('se')?.setLngLat([east, south]);
    
    // Update center marker if it exists
    if (markersRef.current.has('center')) {
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      markersRef.current.get('center')?.setLngLat([centerLng, centerLat]);
    }
  }, [overlay?.boundingBox.north, overlay?.boundingBox.south, overlay?.boundingBox.east, overlay?.boundingBox.west]);

  // Effect: Update overlay layer when overlay changes
  useEffect(() => {
    updateOverlayLayer();
  }, [updateOverlayLayer]);

  // Effect: Update ghost layer when ghost bounds change
  useEffect(() => {
    updateGhostLayer();
  }, [updateGhostLayer]);

  // Effect: Create/remove markers when drag mode or lock status changes
  useEffect(() => {
    createMarkers();
  }, [map, dragMode, overlay?.isLocked]);

  // Effect: Update marker positions when bounds change (without recreating)
  useEffect(() => {
    updateMarkerPositions();
  }, [overlay?.boundingBox.north, overlay?.boundingBox.south, overlay?.boundingBox.east, overlay?.boundingBox.west]);

  // Effect: Add error handler for image loading failures
  useEffect(() => {
    if (!map) return;
    
    const handleError = (e: mapboxgl.ErrorEvent & { sourceId?: string }) => {
      if (e.sourceId === sourceId || e.sourceId === ghostSourceId) {
        console.error('Failed to load overlay image:', e.error?.message || 'Unknown error');
      }
    };
    
    map.on('error', handleError);
    return () => {
      map.off('error', handleError);
    };
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      
      if (map) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
        if (map.getLayer(ghostLayerId)) {
          map.removeLayer(ghostLayerId);
        }
        if (map.getSource(ghostSourceId)) {
          map.removeSource(ghostSourceId);
        }
      }
    };
  }, [map]);

  return {
    updateOverlayLayer,
    createMarkers,
    updateMarkerPositions,
    updateGhostLayer,
  };
}
