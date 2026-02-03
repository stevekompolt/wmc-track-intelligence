// Hook for managing drawing mode and map interactions

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DrawingMode, FeatureType, FeatureGeometry, PointGeometry, LineGeometry, PolygonGeometry } from '@/types/feature';
import mapboxgl from 'mapbox-gl';

interface UseFeatureDrawingOptions {
  map: mapboxgl.Map | null;
  onFeatureComplete: (type: FeatureType, geometry: FeatureGeometry) => void;
}

interface UseFeatureDrawingResult {
  mode: DrawingMode;
  partialCoords: [number, number][];
  isDrawing: boolean;
  
  startDrawing: (type: FeatureType) => void;
  cancelDrawing: () => void;
}

const CLOSE_THRESHOLD = 20; // pixels to consider clicking on first point to close polygon

export function useFeatureDrawing({ map, onFeatureComplete }: UseFeatureDrawingOptions): UseFeatureDrawingResult {
  const [mode, setMode] = useState<DrawingMode>('none');
  const [partialCoords, setPartialCoords] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const modeRef = useRef(mode);
  modeRef.current = mode;
  
  const partialCoordsRef = useRef(partialCoords);
  partialCoordsRef.current = partialCoords;

  // Start drawing a specific feature type
  const startDrawing = useCallback((type: FeatureType) => {
    setMode(type);
    setPartialCoords([]);
    setIsDrawing(true);
    
    if (map) {
      map.getCanvas().style.cursor = 'crosshair';
    }
  }, [map]);

  // Cancel current drawing
  const cancelDrawing = useCallback(() => {
    setMode('none');
    setPartialCoords([]);
    setIsDrawing(false);
    
    if (map) {
      map.getCanvas().style.cursor = '';
    }
  }, [map]);

  // Finish drawing and create feature
  const finishDrawing = useCallback((coords: [number, number][]) => {
    const currentMode = modeRef.current;
    if (currentMode === 'none') return;

    let geometry: FeatureGeometry | null = null;

    if (currentMode === 'point' && coords.length === 1) {
      geometry = {
        type: 'Point',
        coordinates: coords[0],
      } as PointGeometry;
    } else if (currentMode === 'line' && coords.length >= 2) {
      geometry = {
        type: 'LineString',
        coordinates: coords,
      } as LineGeometry;
    } else if (currentMode === 'polygon' && coords.length >= 3) {
      // Close the polygon by adding the first point at the end
      const closedCoords = [...coords, coords[0]];
      geometry = {
        type: 'Polygon',
        coordinates: [closedCoords],
      } as PolygonGeometry;
    }

    if (geometry) {
      onFeatureComplete(currentMode, geometry);
    }

    // Reset state
    setMode('none');
    setPartialCoords([]);
    setIsDrawing(false);
    
    if (map) {
      map.getCanvas().style.cursor = '';
    }
  }, [map, onFeatureComplete]);

  // Check if click is near the first point (for polygon closing)
  const isNearFirstPoint = useCallback((point: mapboxgl.Point, firstCoord: [number, number]): boolean => {
    if (!map) return false;
    const firstPoint = map.project(firstCoord as [number, number]);
    const distance = Math.sqrt(
      Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
    );
    return distance < CLOSE_THRESHOLD;
  }, [map]);

  // Handle map click
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const currentMode = modeRef.current;
      if (currentMode === 'none') return;

      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const currentCoords = partialCoordsRef.current;

      if (currentMode === 'point') {
        // Single click places point immediately
        finishDrawing([coords]);
      } else if (currentMode === 'line') {
        // Add vertex
        setPartialCoords(prev => [...prev, coords]);
      } else if (currentMode === 'polygon') {
        // Check if clicking near first point to close
        if (currentCoords.length >= 3 && isNearFirstPoint(e.point, currentCoords[0])) {
          finishDrawing(currentCoords);
        } else {
          setPartialCoords(prev => [...prev, coords]);
        }
      }
    };

    const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
      const currentMode = modeRef.current;
      const currentCoords = partialCoordsRef.current;
      
      if (currentMode === 'line' && currentCoords.length >= 2) {
        e.preventDefault();
        finishDrawing(currentCoords);
      } else if (currentMode === 'polygon' && currentCoords.length >= 3) {
        e.preventDefault();
        finishDrawing(currentCoords);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [map, finishDrawing, isNearFirstPoint]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modeRef.current !== 'none') {
        cancelDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrawing]);

  return {
    mode,
    partialCoords,
    isDrawing,
    startDrawing,
    cancelDrawing,
  };
}
