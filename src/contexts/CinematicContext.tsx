import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useCurrentMode } from '@/hooks/useCurrentMode';
import { useCameraEngine } from '@/hooks/useCameraEngine';
import type { CameraState, Viewpoint } from '@/types/viewpoint';
import type { CameraTarget, TransitionOptions, SceneType } from '@/types/camera';

interface CinematicContextValue {
  // Camera engine controls
  transitionToViewpoint: (viewpoint: Viewpoint, options?: TransitionOptions) => void;
  cancelTransition: () => void;
  
  // Drift controls
  startDrift: () => void;
  stopDrift: () => void;
  isDrifting: boolean;
  
  // State
  isAnimating: boolean;
  animationProgress: number;
  interactionsEnabled: boolean;
  
  // Mode awareness
  isCinematicMode: boolean;
}

const CinematicContext = createContext<CinematicContextValue | null>(null);

export function CinematicProvider({ children }: { children: React.ReactNode }) {
  const { mapRef, setActiveViewpoint } = useViewpointContext();
  const currentMode = useCurrentMode();
  
  const [interactionsEnabled, setInteractionsEnabled] = useState(true);
  
  // Determine if we're in cinematic mode (Fan mode = cinematic)
  const isCinematicMode = currentMode === 'fan';
  
  // Camera update callback
  const handleCameraUpdate = useCallback((state: CameraState) => {
    if (mapRef.current) {
      mapRef.current.setCameraState?.(state);
    }
  }, [mapRef]);
  
  // Initialize camera engine
  const {
    flyToTarget,
    cancelAnimation,
    startDrift: engineStartDrift,
    stopDrift: engineStopDrift,
    state: engineState,
    progress,
  } = useCameraEngine({
    onCameraUpdate: handleCameraUpdate,
  });
  
  // Derived state
  const isAnimating = engineState === 'animating';
  const isDrifting = engineState === 'drifting';
  
  // Enable/disable map interactions based on mode
  useEffect(() => {
    const shouldEnableInteractions = !isCinematicMode;
    setInteractionsEnabled(shouldEnableInteractions);
    
    if (mapRef.current?.setInteractionsEnabled) {
      mapRef.current.setInteractionsEnabled(shouldEnableInteractions);
    }
  }, [isCinematicMode, mapRef]);
  
  // Transition to a viewpoint with cinematic animation
  const transitionToViewpoint = useCallback((
    viewpoint: Viewpoint,
    options: TransitionOptions = {}
  ) => {
    // Convert Viewpoint to CameraTarget
    const target: CameraTarget = {
      latitude: viewpoint.latitude,
      longitude: viewpoint.longitude,
      height: viewpoint.height,
      heading: viewpoint.heading,
      pitch: viewpoint.pitch,
      roll: viewpoint.roll,
      sceneType: options.sceneType || 'standard',
    };
    
    // Update active viewpoint in context (without triggering its flyTo)
    // We'll handle the animation ourselves
    
    // Start cinematic transition
    flyToTarget(target, options);
  }, [flyToTarget]);
  
  // Cancel current transition
  const cancelTransition = useCallback(() => {
    cancelAnimation();
  }, [cancelAnimation]);
  
  // Drift controls with mode awareness
  const startDrift = useCallback(() => {
    if (isCinematicMode) {
      engineStartDrift();
    }
  }, [isCinematicMode, engineStartDrift]);
  
  const stopDrift = useCallback(() => {
    engineStopDrift();
  }, [engineStopDrift]);
  
  const value: CinematicContextValue = {
    transitionToViewpoint,
    cancelTransition,
    startDrift,
    stopDrift,
    isDrifting,
    isAnimating,
    animationProgress: progress,
    interactionsEnabled,
    isCinematicMode,
  };
  
  return (
    <CinematicContext.Provider value={value}>
      {children}
    </CinematicContext.Provider>
  );
}

export function useCinematicContext() {
  const context = useContext(CinematicContext);
  if (!context) {
    throw new Error('useCinematicContext must be used within a CinematicProvider');
  }
  return context;
}
