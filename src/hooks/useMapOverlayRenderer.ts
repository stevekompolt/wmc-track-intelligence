import { useEffect, useRef, useCallback } from 'react';
import mapboxgl, { Marker, LngLatLike } from 'mapbox-gl';
import type { MapOverlay, CornerHandle } from '@/types/overlay';

interface UseMapOverlayRendererOptions {
  map: mapboxgl.Map | null;
  overlay: MapOverlay | null;
  dragMode: 'none' | 'corners' | 'move';
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
  onCornerDrag,
  onMoveDrag,
}: UseMapOverlayRendererOptions) {
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const sourceId = 'overlay-image';
  const layerId = 'overlay-layer';
  const dragStartRef = useRef<{ lat: number; lng: number } | null>(null);

  // Add/update overlay image source and layer
  const updateOverlayLayer = useCallback(() => {
    if (!map || !overlay || !overlay.imageUrl) return;

    const { north, south, east, west } = overlay.boundingBox;
    
    // Validate coordinates
    if (north <= south || east <= west) return;

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

  // Create corner markers
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

    marker.on('drag', () => {
      const pos = marker.getLngLat();
      onCornerDrag(corner, pos.lat, pos.lng);
    });

    return marker;
  }, [onCornerDrag]);

  // Create center marker for moving
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
      dragStartRef.current = marker.getLngLat();
    });

    marker.on('drag', () => {
      if (!dragStartRef.current) return;
      const pos = marker.getLngLat();
      const deltaLat = pos.lat - dragStartRef.current.lat;
      const deltaLng = pos.lng - dragStartRef.current.lng;
      onMoveDrag(deltaLat, deltaLng);
      dragStartRef.current = pos;
    });

    marker.on('dragend', () => {
      dragStartRef.current = null;
    });

    return marker;
  }, [onMoveDrag]);

  // Update markers based on drag mode
  const updateMarkers = useCallback(() => {
    if (!map || !overlay) {
      // Remove all markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      return;
    }

    const { north, south, east, west } = overlay.boundingBox;
    
    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

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
  }, [map, overlay, dragMode, createCornerMarker, createCenterMarker]);

  // Effect: Update overlay layer when overlay changes
  useEffect(() => {
    updateOverlayLayer();
  }, [updateOverlayLayer]);

  // Effect: Update markers when drag mode changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

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
      }
    };
  }, [map]);

  return {
    updateOverlayLayer,
    updateMarkers,
  };
}
