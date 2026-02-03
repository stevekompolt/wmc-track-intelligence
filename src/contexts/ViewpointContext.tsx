import React, { createContext, useContext, useMemo, useRef, useCallback } from 'react';
import { useViewpoints, useCreateViewpoint } from '@/hooks/useViewpoints';
import { useCurrentMode } from '@/hooks/useCurrentMode';
import { useTrackContext } from '@/contexts/TrackContext';
import type { Viewpoint, CameraState, ViewpointFormData, AppMode } from '@/types/viewpoint';

// Map ref interface - methods exposed by TrackMap
export interface TrackMapRef {
  flyToViewpoint: (viewpoint: Viewpoint) => void;
  captureCamera: () => CameraState | null;
  setCameraState?: (state: CameraState) => void;
  setInteractionsEnabled?: (enabled: boolean) => void;
  getMapInstance?: () => unknown;
}

interface ViewpointContextValue {
  // Data
  viewpoints: Viewpoint[];
  filteredViewpoints: Viewpoint[];
  isLoading: boolean;
  error: Error | null;
  
  // State
  activeViewpoint: Viewpoint | null;
  setActiveViewpoint: (viewpoint: Viewpoint | null) => void;
  
  // Actions
  saveViewpoint: (data: ViewpointFormData) => Promise<void>;
  captureCamera: () => CameraState | null;
  
  // Map ref
  mapRef: React.RefObject<TrackMapRef>;
  
  // Current mode
  currentMode: AppMode;
}

const ViewpointContext = createContext<ViewpointContextValue | null>(null);

export function ViewpointProvider({ children }: { children: React.ReactNode }) {
  const { selectedTrack } = useTrackContext();
  const currentMode = useCurrentMode();
  const mapRef = useRef<TrackMapRef>(null);
  const [activeViewpoint, setActiveViewpointState] = React.useState<Viewpoint | null>(null);
  
  // Fetch viewpoints for current venue
  const { data: viewpoints = [], isLoading, error } = useViewpoints(selectedTrack?.id);
  const createMutation = useCreateViewpoint();
  
  // Filter viewpoints by current mode and visibility
  const filteredViewpoints = useMemo(() => {
    return viewpoints.filter(vp => {
      // Must be published
      if (vp.status !== 'published') return false;
      
      // Must be visible in current mode
      const modeRecord = vp.modes.find(m => m.mode === currentMode);
      if (!modeRecord || !modeRecord.visible) return false;
      
      return true;
    }).sort((a, b) => a.priority - b.priority);
  }, [viewpoints, currentMode]);
  
  // Set active viewpoint and fly to it
  const setActiveViewpoint = useCallback((viewpoint: Viewpoint | null) => {
    setActiveViewpointState(viewpoint);
    if (viewpoint && mapRef.current) {
      mapRef.current.flyToViewpoint(viewpoint);
    }
  }, []);
  
  // Capture current camera state
  const captureCamera = useCallback((): CameraState | null => {
    if (!mapRef.current) return null;
    return mapRef.current.captureCamera();
  }, []);
  
  // Save a new viewpoint
  const saveViewpoint = useCallback(async (data: ViewpointFormData) => {
    if (!selectedTrack?.id) {
      throw new Error('No track selected');
    }
    await createMutation.mutateAsync({
      venueId: selectedTrack.id,
      data,
    });
  }, [selectedTrack, createMutation]);
  
  const value: ViewpointContextValue = {
    viewpoints,
    filteredViewpoints,
    isLoading,
    error: error as Error | null,
    activeViewpoint,
    setActiveViewpoint,
    saveViewpoint,
    captureCamera,
    mapRef,
    currentMode,
  };
  
  return (
    <ViewpointContext.Provider value={value}>
      {children}
    </ViewpointContext.Provider>
  );
}

export function useViewpointContext() {
  const context = useContext(ViewpointContext);
  if (!context) {
    throw new Error('useViewpointContext must be used within a ViewpointProvider');
  }
  return context;
}
