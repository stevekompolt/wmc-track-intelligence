import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import type { TourState, TourScene, TourConfig } from '@/types/tour';
import type { Viewpoint } from '@/types/viewpoint';

// Generate tour scenes from fan-visible viewpoints
function generateTourScenes(viewpoints: Viewpoint[]): TourScene[] {
  const fanViewpoints = viewpoints.filter(vp => vp.visibleToFans && vp.status === 'published');
  
  // Sort by priority and create scenes
  return fanViewpoints
    .sort((a, b) => a.priority - b.priority)
    .map((vp, index, arr) => {
      // Scene duration based on position
      const isFirst = index === 0;
      const isLast = index === arr.length - 1;
      const duration = isFirst ? 12 : isLast ? 15 : 8;
      
      return {
        id: `scene-${index + 1}`,
        viewpointId: vp.id,
        name: vp.name,
        description: vp.description || `Experience the ${vp.name.toLowerCase()} from this stunning vantage point.`,
        duration,
      };
    });
}

export function useCinematicTour() {
  const { viewpoints, setActiveViewpoint } = useViewpointContext();
  
  const [tourState, setTourState] = useState<TourState>('idle');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate tour config from viewpoints
  const tourConfig: TourConfig = useMemo(() => {
    const scenes = generateTourScenes(viewpoints);
    return {
      scenes,
      totalDuration: scenes.reduce((acc, scene) => acc + scene.duration, 0),
    };
  }, [viewpoints]);
  
  const { scenes } = tourConfig;
  const currentScene = scenes[currentSceneIndex] || null;
  
  // Calculate overall progress
  const progress = useMemo(() => {
    if (scenes.length === 0) return 0;
    const completedDuration = scenes
      .slice(0, currentSceneIndex)
      .reduce((acc, scene) => acc + scene.duration, 0);
    const currentDuration = currentScene ? currentScene.duration * sceneProgress : 0;
    return (completedDuration + currentDuration) / tourConfig.totalDuration;
  }, [scenes, currentSceneIndex, sceneProgress, currentScene, tourConfig.totalDuration]);
  
  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);
  
  // Fly to scene viewpoint
  const flyToScene = useCallback((sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    const viewpoint = viewpoints.find(vp => vp.id === scene.viewpointId);
    if (viewpoint) {
      setActiveViewpoint(viewpoint);
    }
  }, [scenes, viewpoints, setActiveViewpoint]);
  
  // Start progress tracking for current scene
  const startProgressTracking = useCallback((duration: number) => {
    setSceneProgress(0);
    const startTime = Date.now();
    
    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min(elapsed / duration, 1);
      setSceneProgress(newProgress);
    }, 100);
  }, []);
  
  // Advance to next scene
  const advanceScene = useCallback(() => {
    clearTimers();
    
    if (currentSceneIndex >= scenes.length - 1) {
      // Tour completed
      setTourState('completed');
      setSceneProgress(1);
      return;
    }
    
    const nextIndex = currentSceneIndex + 1;
    setCurrentSceneIndex(nextIndex);
    flyToScene(nextIndex);
    
    const nextScene = scenes[nextIndex];
    if (nextScene) {
      startProgressTracking(nextScene.duration);
      timerRef.current = setTimeout(advanceScene, nextScene.duration * 1000);
    }
  }, [currentSceneIndex, scenes, clearTimers, flyToScene, startProgressTracking]);
  
  // Play tour
  const play = useCallback(() => {
    if (scenes.length === 0) return;
    
    if (tourState === 'idle' || tourState === 'completed') {
      // Start from beginning
      setCurrentSceneIndex(0);
      flyToScene(0);
      setTourState('playing');
      
      const firstScene = scenes[0];
      startProgressTracking(firstScene.duration);
      timerRef.current = setTimeout(advanceScene, firstScene.duration * 1000);
    } else if (tourState === 'paused') {
      // Resume from current position
      setTourState('playing');
      
      const scene = scenes[currentSceneIndex];
      if (scene) {
        const remainingTime = scene.duration * (1 - sceneProgress);
        startProgressTracking(remainingTime);
        timerRef.current = setTimeout(advanceScene, remainingTime * 1000);
      }
    }
  }, [tourState, scenes, currentSceneIndex, sceneProgress, flyToScene, advanceScene, startProgressTracking]);
  
  // Pause tour
  const pause = useCallback(() => {
    clearTimers();
    setTourState('paused');
  }, [clearTimers]);
  
  // Replay tour
  const replay = useCallback(() => {
    clearTimers();
    setCurrentSceneIndex(0);
    setSceneProgress(0);
    flyToScene(0);
    setTourState('playing');
    
    const firstScene = scenes[0];
    if (firstScene) {
      startProgressTracking(firstScene.duration);
      timerRef.current = setTimeout(advanceScene, firstScene.duration * 1000);
    }
  }, [clearTimers, flyToScene, scenes, advanceScene, startProgressTracking]);
  
  // Jump to specific scene
  const jumpToScene = useCallback((index: number) => {
    if (index < 0 || index >= scenes.length) return;
    
    clearTimers();
    setCurrentSceneIndex(index);
    setSceneProgress(0);
    flyToScene(index);
    
    if (tourState === 'playing') {
      const scene = scenes[index];
      if (scene) {
        startProgressTracking(scene.duration);
        timerRef.current = setTimeout(advanceScene, scene.duration * 1000);
      }
    }
  }, [scenes, tourState, clearTimers, flyToScene, startProgressTracking, advanceScene]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);
  
  return {
    // State
    tourState,
    currentSceneIndex,
    currentScene,
    progress,
    sceneProgress,
    
    // Config
    scenes,
    totalDuration: tourConfig.totalDuration,
    sceneCount: scenes.length,
    
    // Actions
    play,
    pause,
    replay,
    jumpToScene,
    
    // Computed
    isPlaying: tourState === 'playing',
    isPaused: tourState === 'paused',
    isCompleted: tourState === 'completed',
    isIdle: tourState === 'idle',
    hasScenes: scenes.length > 0,
  };
}
