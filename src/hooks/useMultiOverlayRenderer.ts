// Multi-overlay renderer for displaying multiple image overlays on the map
// Used by TrackEditor for editing and SharedMapContainer for view-only rendering

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl, { Marker, LngLatLike } from 'mapbox-gl';
import type { MapOverlay, CornerHandle, BoundingBox } from '@/types/overlay';
import { dataUrlToBlobUrl, revokeAllBlobUrls } from '@/lib/blobUrl';

interface UseMultiOverlayRendererOptions {
  map: mapboxgl.Map | null;
  overlays: MapOverlay[];
  hiddenOverlayIds: Set<string>;
  editingOverlayId?: string | null;
  dragMode?: 'none' | 'corners' | 'move';
  ghostBounds?: BoundingBox | null;
  onCornerDrag?: (corner: CornerHandle, lat: number, lng: number) => void;
  onMoveDrag?: (deltaLat: number, deltaLng: number) => void;
  onDragEnd?: () => void;
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

// Generate unique source/layer IDs per overlay
const getSourceId = (overlayId: string) => `overlay-image-${overlayId}`;
const getLayerId = (overlayId: string) => `overlay-layer-${overlayId}`;
const ghostSourceId = 'overlay-ghost';
const ghostLayerId = 'overlay-ghost-layer';

export function useMultiOverlayRenderer({
  map,
  overlays,
  hiddenOverlayIds,
  editingOverlayId,
  dragMode = 'none',
  ghostBounds,
  onCornerDrag,
  onMoveDrag,
  onDragEnd,
}: UseMultiOverlayRendererOptions) {
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const renderedOverlayIdsRef = useRef<Set<string>>(new Set());
  const dragStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  // Store callback refs
  const onCornerDragRef = useRef(onCornerDrag);
  onCornerDragRef.current = onCornerDrag;
  
  const onMoveDragRef = useRef(onMoveDrag);
  onMoveDragRef.current = onMoveDrag;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // Add/update a single overlay
  const updateOverlayLayer = useCallback((overlay: MapOverlay) => {
    if (!map || !overlay.imageUrl) {
      console.warn(`[OverlayRenderer] Skipping overlay "${overlay.name}": map=${!!map}, imageUrl=${!!overlay.imageUrl} (len=${overlay.imageUrl?.length || 0})`);
      return;
    }

    const { north, south, east, west } = overlay.boundingBox;
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) {
      console.warn(`[OverlayRenderer] Skipping overlay "${overlay.name}": invalid bounds`, overlay.boundingBox);
      return;
    }

    const sourceId = getSourceId(overlay.id);
    const layerId = getLayerId(overlay.id);

    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ];

    const imageUrl = dataUrlToBlobUrl(overlay.imageUrl);
    console.log(`[OverlayRenderer] Rendering overlay "${overlay.name}" — blobUrl=${imageUrl.substring(0, 60)}... bounds=`, { north, south, east, west });
    const source = map.getSource(sourceId) as mapboxgl.ImageSource;
    
    if (source) {
      source.updateImage({
        url: imageUrl,
        coordinates,
      });
    } else {
      map.addSource(sourceId, {
        type: 'image',
        url: imageUrl,
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
      map.triggerRepaint();
    }

    // Update opacity
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', overlay.opacity);
    }
  }, [map]);

  // Remove an overlay from the map
  const removeOverlayLayer = useCallback((overlayId: string) => {
    if (!map) return;
    
    const sourceId = getSourceId(overlayId);
    const layerId = getLayerId(overlayId);
    
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    
    renderedOverlayIdsRef.current.delete(overlayId);
  }, [map]);

  // Update ghost preview layer for editing
  const updateGhostLayer = useCallback(() => {
    if (!map) return;
    
    const editingOverlay = overlays.find(o => o.id === editingOverlayId);
    
    if (!ghostBounds || !editingOverlay?.imageUrl) {
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

    const ghostImageUrl = dataUrlToBlobUrl(editingOverlay.imageUrl);
    const source = map.getSource(ghostSourceId) as mapboxgl.ImageSource;
    
    if (source) {
      source.updateImage({
        url: ghostImageUrl,
        coordinates,
      });
    } else {
      map.addSource(ghostSourceId, {
        type: 'image',
        url: ghostImageUrl,
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
  }, [map, overlays, editingOverlayId, ghostBounds]);

  // Create corner marker
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
    }).setLngLat(lngLat);

    marker.on('dragstart', () => {
      isDraggingRef.current = true;
    });

    marker.on('drag', () => {
      const pos = marker.getLngLat();
      onCornerDragRef.current?.(corner, pos.lat, pos.lng);
    });

    marker.on('dragend', () => {
      isDraggingRef.current = false;
    });

    return marker;
  }, []);

  // Create center marker
  const createCenterMarker = useCallback((lngLat: LngLatLike): Marker => {
    const el = document.createElement('div');
    el.style.cssText = CENTER_MARKER_STYLE;
    el.setAttribute('data-role', 'center');

    const marker = new mapboxgl.Marker({
      element: el,
      draggable: true,
    }).setLngLat(lngLat);

    marker.on('dragstart', () => {
      isDraggingRef.current = true;
      dragStartRef.current = marker.getLngLat();
    });

    marker.on('drag', () => {
      if (!dragStartRef.current) return;
      const pos = marker.getLngLat();
      const deltaLat = pos.lat - dragStartRef.current.lat;
      const deltaLng = pos.lng - dragStartRef.current.lng;
      onMoveDragRef.current?.(deltaLat, deltaLng);
      dragStartRef.current = pos;
    });

    marker.on('dragend', () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
    });

    return marker;
  }, []);

  // Create/update markers for editing overlay
  const createMarkers = useCallback(() => {
    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    
    if (!map || !editingOverlayId) return;
    
    const editingOverlay = overlays.find(o => o.id === editingOverlayId);
    if (!editingOverlay || !editingOverlay.imageUrl) return;

    const { north, south, east, west } = editingOverlay.boundingBox;
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) return;

    if (dragMode === 'corners' && !editingOverlay.isLocked) {
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
    } else if (dragMode === 'move' && !editingOverlay.isLocked) {
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      const marker = createCenterMarker([centerLng, centerLat]);
      marker.addTo(map);
      markersRef.current.set('center', marker);
    }
  }, [map, overlays, editingOverlayId, dragMode, createCornerMarker, createCenterMarker]);

  // Update marker positions without recreating
  const updateMarkerPositions = useCallback(() => {
    if (!editingOverlayId || isDraggingRef.current) return;
    
    const editingOverlay = overlays.find(o => o.id === editingOverlayId);
    if (!editingOverlay) return;
    
    const { north, south, east, west } = editingOverlay.boundingBox;
    const hasValidBounds = north > south && east > west;
    
    if (!hasValidBounds) return;

    markersRef.current.get('nw')?.setLngLat([west, north]);
    markersRef.current.get('ne')?.setLngLat([east, north]);
    markersRef.current.get('sw')?.setLngLat([west, south]);
    markersRef.current.get('se')?.setLngLat([east, south]);
    
    if (markersRef.current.has('center')) {
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      markersRef.current.get('center')?.setLngLat([centerLng, centerLat]);
    }
  }, [overlays, editingOverlayId]);

  // Effect: Sync overlays with map
  useEffect(() => {
    if (!map) {
      console.log('[OverlayRenderer] Effect: no map yet');
      return;
    }
    
    console.log(`[OverlayRenderer] Effect running: ${overlays.length} overlays, ${hiddenOverlayIds.size} hidden`);
    overlays.forEach(o => console.log(`  → overlay "${o.name}" id=${o.id} imageUrl=${o.imageUrl ? `yes (${o.imageUrl.length} chars)` : 'NO'} hidden=${hiddenOverlayIds.has(o.id)}`));
    
    const setupLayers = () => {
      console.log(`[OverlayRenderer] setupLayers() called`);
      // Get all overlay IDs currently in the data
      const allOverlayIds = new Set(overlays.map(o => o.id));
      
      // Get IDs of overlays that should be rendered (visible + have image)
      const visibleOverlays = overlays.filter(o => 
        !hiddenOverlayIds.has(o.id) && o.imageUrl
      );
      console.log(`[OverlayRenderer] visibleOverlays: ${visibleOverlays.length}`);
      const visibleIds = new Set(visibleOverlays.map(o => o.id));
      
      // Remove overlays that are either:
      // 1. No longer in the overlays array (deleted)
      // 2. Hidden or missing imageUrl
      renderedOverlayIdsRef.current.forEach(id => {
        if (!allOverlayIds.has(id) || !visibleIds.has(id)) {
          removeOverlayLayer(id);
        }
      });
      
      // Add/update visible overlays
      visibleOverlays.forEach(overlay => {
        updateOverlayLayer(overlay);
      });
      
      // Diagnostic: warn about overlays with bounds but no image
      overlays.forEach(overlay => {
        const { north, south, east, west } = overlay.boundingBox;
        if (north > south && east > west && !overlay.imageUrl) {
          console.warn(`[Overlay "${overlay.name}" (${overlay.id})]: has valid bounds but missing imageUrl — re-upload the image.`);
        }
      });
      
      // Force repaint after layer changes
      map.triggerRepaint();
    };
    
    // Always try to set up layers immediately — isStyleLoaded() can return false
    // in Mapbox v3 while tiles are loading, even though the style object is ready.
    try {
      setupLayers();
    } catch (e) {
      console.warn('[OverlayRenderer] setupLayers failed, will retry on style.load', e);
      map.once('style.load', setupLayers);
    }
    
    const handleStyleLoad = () => {
      renderedOverlayIdsRef.current.clear();
      setupLayers();
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
      // Also remove the once listener to prevent stale closure
      map.off('style.load', setupLayers);
    };
  }, [map, overlays, hiddenOverlayIds, updateOverlayLayer, removeOverlayLayer]);

  // Effect: Update ghost layer
  useEffect(() => {
    updateGhostLayer();
  }, [updateGhostLayer]);

  // Effect: Create/remove markers when drag mode changes
  useEffect(() => {
    createMarkers();
  }, [createMarkers]);

  // Effect: Update marker positions
  useEffect(() => {
    updateMarkerPositions();
  }, [updateMarkerPositions]);

  // Effect: Error handler for image loading
  useEffect(() => {
    if (!map) return;
    
    const handleError = (e: mapboxgl.ErrorEvent & { sourceId?: string }) => {
      if (e.sourceId?.startsWith('overlay-image-') || e.sourceId === ghostSourceId) {
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
      revokeAllBlobUrls();
      
      // Check map is valid and style is loaded before cleanup
      if (map && map.isStyleLoaded()) {
        try {
          // Remove all overlay layers
          renderedOverlayIdsRef.current.forEach(id => {
            const layerId = getLayerId(id);
            const sourceId = getSourceId(id);
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
            if (map.getSource(sourceId)) {
              map.removeSource(sourceId);
            }
          });
          
          // Remove ghost layer
          if (map.getLayer(ghostLayerId)) {
            map.removeLayer(ghostLayerId);
          }
          if (map.getSource(ghostSourceId)) {
            map.removeSource(ghostSourceId);
          }
        } catch (e) {
          // Ignore cleanup errors during map destruction
        }
      }
    };
  }, [map]);

  return {
    updateOverlayLayer,
    removeOverlayLayer,
    createMarkers,
    updateMarkerPositions,
    updateGhostLayer,
  };
}
