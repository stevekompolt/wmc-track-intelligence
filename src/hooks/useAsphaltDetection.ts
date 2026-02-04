import { useState, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { 
  DetectionThresholds, 
  DEFAULT_THRESHOLDS,
  createDetectionPreview 
} from '@/lib/imageAnalysis';
import type { PolygonGeometry } from '@/types/feature';

interface UseAsphaltDetectionProps {
  map: mapboxgl.Map | null;
  onDetectionComplete: (geometry: PolygonGeometry) => void;
}

interface UseAsphaltDetectionReturn {
  isDialogOpen: boolean;
  isDetecting: boolean;
  detectedCoords: [number, number][][] | null;
  thresholds: DetectionThresholds;
  useBoundary: boolean;
  bufferWidth: number;
  openDialog: () => void;
  closeDialog: () => void;
  runDetection: (boundaryLineCoords?: [number, number][]) => void;
  applyDetection: () => void;
  updateThreshold: <K extends keyof DetectionThresholds>(key: K, value: DetectionThresholds[K]) => void;
  setUseBoundary: (value: boolean) => void;
  setBufferWidth: (value: number) => void;
}

export function useAsphaltDetection({
  map,
  onDetectionComplete,
}: UseAsphaltDetectionProps): UseAsphaltDetectionReturn {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<[number, number][][] | null>(null);
  const [thresholds, setThresholds] = useState<DetectionThresholds>(DEFAULT_THRESHOLDS);
  const [useBoundary, setUseBoundary] = useState(false);
  const [bufferWidth, setBufferWidth] = useState(100); // meters
  
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastBoundaryRef = useRef<[number, number][] | undefined>(undefined);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setDetectedCoords(null);
  }, []);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
    setDetectedCoords(null);
  }, []);

  const closeDialog = useCallback(() => {
    cleanup();
    setIsDialogOpen(false);
    setThresholds(DEFAULT_THRESHOLDS);
    setUseBoundary(false);
    setBufferWidth(100);
    lastBoundaryRef.current = undefined;
  }, [cleanup]);

  const runDetection = useCallback((boundaryLineCoords?: [number, number][]) => {
    if (!map) return;
    
    setIsDetecting(true);
    cleanup();
    lastBoundaryRef.current = boundaryLineCoords;
    
    // Run detection (synchronous but wrapped for UI feedback)
    requestAnimationFrame(() => {
      try {
        const result = createDetectionPreview(
          map, 
          thresholds,
          useBoundary ? boundaryLineCoords : undefined,
          useBoundary ? bufferWidth : undefined
        );
        cleanupRef.current = result.cleanup;
        setDetectedCoords(result.detectedCoords);
      } catch (error) {
        console.error('Detection failed:', error);
        setDetectedCoords(null);
      } finally {
        setIsDetecting(false);
      }
    });
  }, [map, thresholds, useBoundary, bufferWidth, cleanup]);

  const applyDetection = useCallback(() => {
    if (!detectedCoords || detectedCoords.length === 0) return;
    
    const geometry: PolygonGeometry = {
      type: 'Polygon',
      coordinates: detectedCoords,
    };
    
    onDetectionComplete(geometry);
    closeDialog();
  }, [detectedCoords, onDetectionComplete, closeDialog]);

  const updateThreshold = useCallback(<K extends keyof DetectionThresholds>(
    key: K,
    value: DetectionThresholds[K]
  ) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
    // Clear previous detection when thresholds change
    cleanup();
  }, [cleanup]);

  const handleSetUseBoundary = useCallback((value: boolean) => {
    setUseBoundary(value);
    cleanup();
  }, [cleanup]);

  const handleSetBufferWidth = useCallback((value: number) => {
    setBufferWidth(value);
    cleanup();
  }, [cleanup]);

  return {
    isDialogOpen,
    isDetecting,
    detectedCoords,
    thresholds,
    useBoundary,
    bufferWidth,
    openDialog,
    closeDialog,
    runDetection,
    applyDetection,
    updateThreshold,
    setUseBoundary: handleSetUseBoundary,
    setBufferWidth: handleSetBufferWidth,
  };
}
