import { useRef, useCallback, useState, useEffect } from 'react';
import type { CameraState } from '@/types/viewpoint';
import type { 
  CameraTarget, 
  CameraEngineState, 
  TransitionOptions,
  DriftConfig,
  DEFAULT_DRIFT_CONFIG,
  DEFAULT_CAMERA_CONSTRAINTS,
  DEFAULT_EASING_PROFILE
} from '@/types/camera';
import { 
  cinematicEase, 
  interpolateCamera, 
  calculateDriftOffset,
  greatCircleDistance,
  calculateDuration
} from '@/lib/cameraEasing';
import { validateViewpoint } from '@/lib/cameraPathCalculator';

interface CameraEngineOptions {
  onCameraUpdate: (state: CameraState) => void;
  constraints?: typeof DEFAULT_CAMERA_CONSTRAINTS;
  driftConfig?: DriftConfig;
}

interface CameraEngineReturn {
  flyToTarget: (target: CameraTarget, options?: TransitionOptions) => void;
  cancelAnimation: () => void;
  startDrift: () => void;
  stopDrift: () => void;
  state: CameraEngineState;
  progress: number;
  currentCamera: CameraState | null;
}

const defaultDriftConfig: DriftConfig = {
  headingAmplitude: 2,
  headingPeriod: 20000,
  pitchAmplitude: 1,
  pitchPeriod: 15000,
};

const defaultConstraints = {
  minZoom: 8,
  maxZoom: 20,
  maxPitch: 75,
  maxRoll: 5,
};

export function useCameraEngine(options: CameraEngineOptions): CameraEngineReturn {
  const { 
    onCameraUpdate, 
    constraints = defaultConstraints,
    driftConfig = defaultDriftConfig
  } = options;
  
  // State
  const [engineState, setEngineState] = useState<CameraEngineState>('idle');
  const [progress, setProgress] = useState(0);
  
  // Refs for animation state
  const animationRef = useRef<number | null>(null);
  const currentCameraRef = useRef<CameraState | null>(null);
  const targetRef = useRef<CameraTarget | null>(null);
  const startCameraRef = useRef<CameraState | null>(null);
  const animationStartRef = useRef<number>(0);
  const animationDurationRef = useRef<number>(0);
  const optionsRef = useRef<TransitionOptions>({});
  const driftStartRef = useRef<number>(0);
  const driftBaseRef = useRef<CameraState | null>(null);
  
  // Animation loop for fly-to
  const animationLoop = useCallback((timestamp: number) => {
    const elapsed = timestamp - animationStartRef.current;
    const duration = animationDurationRef.current;
    const rawProgress = Math.min(elapsed / duration, 1);
    
    // Apply cinematic easing
    const easingProfile = optionsRef.current.easingProfile || {
      easeInPercent: 0.20,
      glidePercent: 0.60,
      easeOutPercent: 0.20,
    };
    const easedProgress = cinematicEase(rawProgress, easingProfile);
    
    // Interpolate camera
    if (startCameraRef.current && targetRef.current) {
      const interpolated = interpolateCamera(
        startCameraRef.current,
        targetRef.current,
        easedProgress,
        constraints
      );
      
      currentCameraRef.current = interpolated;
      onCameraUpdate(interpolated);
      setProgress(rawProgress);
      
      // Call progress callback
      optionsRef.current.onProgress?.(rawProgress);
    }
    
    // Continue or complete
    if (rawProgress < 1) {
      animationRef.current = requestAnimationFrame(animationLoop);
    } else {
      // Animation complete
      setEngineState('idle');
      setProgress(1);
      optionsRef.current.onComplete?.();
    }
  }, [onCameraUpdate, constraints]);
  
  // Drift animation loop
  const driftLoop = useCallback((timestamp: number) => {
    if (!driftBaseRef.current) return;
    
    const elapsed = timestamp - driftStartRef.current;
    const offset = calculateDriftOffset(
      elapsed,
      driftConfig.headingAmplitude,
      driftConfig.headingPeriod,
      driftConfig.pitchAmplitude,
      driftConfig.pitchPeriod
    );
    
    const driftedCamera: CameraState = {
      ...driftBaseRef.current,
      heading: (driftBaseRef.current.heading + offset.heading + 360) % 360,
      pitch: Math.max(
        -constraints.maxPitch,
        Math.min(constraints.maxPitch, driftBaseRef.current.pitch + offset.pitch)
      ),
    };
    
    currentCameraRef.current = driftedCamera;
    onCameraUpdate(driftedCamera);
    
    if (engineState === 'drifting') {
      animationRef.current = requestAnimationFrame(driftLoop);
    }
  }, [onCameraUpdate, driftConfig, constraints, engineState]);
  
  // Fly to target
  const flyToTarget = useCallback((
    target: CameraTarget, 
    transitionOptions: TransitionOptions = {}
  ) => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Validate target
    const validatedTarget = validateViewpoint(target);
    
    // Calculate start position (current position or target if no current)
    const startCamera = currentCameraRef.current || validatedTarget;
    
    // Calculate distance and duration
    const distance = greatCircleDistance(
      startCamera.latitude,
      startCamera.longitude,
      validatedTarget.latitude,
      validatedTarget.longitude
    );
    
    const baseDuration = transitionOptions.duration || calculateDuration(distance);
    
    // Adjust duration for scene type
    let duration = baseDuration;
    if (validatedTarget.sceneType === 'hero') {
      duration = Math.max(baseDuration, 12000);
    } else if (validatedTarget.sceneType === 'final') {
      duration = Math.max(baseDuration, 15000);
    }
    
    // Store animation state
    startCameraRef.current = startCamera;
    targetRef.current = validatedTarget;
    animationDurationRef.current = duration;
    optionsRef.current = transitionOptions;
    
    // Start animation
    setEngineState('animating');
    setProgress(0);
    animationStartRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animationLoop);
  }, [animationLoop]);
  
  // Cancel animation
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setEngineState('idle');
  }, []);
  
  // Start drift motion
  const startDrift = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    driftBaseRef.current = currentCameraRef.current;
    driftStartRef.current = performance.now();
    setEngineState('drifting');
    
    animationRef.current = requestAnimationFrame(driftLoop);
  }, [driftLoop]);
  
  // Stop drift motion
  const stopDrift = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setEngineState('idle');
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return {
    flyToTarget,
    cancelAnimation,
    startDrift,
    stopDrift,
    state: engineState,
    progress,
    currentCamera: currentCameraRef.current,
  };
}
