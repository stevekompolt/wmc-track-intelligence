import type { CameraState } from './viewpoint';

// Scene types for duration mapping
export type SceneType = 'standard' | 'hero' | 'final';

// Camera engine states
export type CameraEngineState = 'idle' | 'animating' | 'drifting';

// Extended camera target with optional features
export interface CameraTarget extends CameraState {
  boundingBox?: [[number, number], [number, number]]; // [sw, ne] as [lng, lat]
  targetElement?: {
    id: string;
    geometry?: GeoJSON.Geometry;
  };
  sceneType?: SceneType;
}

// Configurable easing profile
export interface EasingProfile {
  easeInPercent: number;  // Default: 0.20 (20%)
  glidePercent: number;   // Default: 0.60 (60%)
  easeOutPercent: number; // Default: 0.20 (20%)
}

// Camera constraints to prevent visual issues
export interface CameraConstraints {
  minZoom: number;    // Default: 8
  maxZoom: number;    // Default: 20
  maxPitch: number;   // Default: 75 (degrees)
  maxRoll: number;    // Default: 5 (degrees)
}

// Default constraints
export const DEFAULT_CAMERA_CONSTRAINTS: CameraConstraints = {
  minZoom: 8,
  maxZoom: 20,
  maxPitch: 75,
  maxRoll: 5,
};

// Default easing profile
export const DEFAULT_EASING_PROFILE: EasingProfile = {
  easeInPercent: 0.20,
  glidePercent: 0.60,
  easeOutPercent: 0.20,
};

// Scene duration mapping (in ms)
export const SCENE_DURATIONS: Record<SceneType, number> = {
  standard: 8000,
  hero: 12000,
  final: 15000,
};

// Animation transition options
export interface TransitionOptions {
  sceneType?: SceneType;
  duration?: number; // Override calculated duration (ms)
  easingProfile?: EasingProfile;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

// Drift configuration
export interface DriftConfig {
  headingAmplitude: number;  // Default: 2 degrees
  headingPeriod: number;     // Default: 20000ms
  pitchAmplitude: number;    // Default: 1 degree
  pitchPeriod: number;       // Default: 15000ms
}

export const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  headingAmplitude: 2,
  headingPeriod: 20000,
  pitchAmplitude: 1,
  pitchPeriod: 15000,
};

// Pre-calculated transition between two camera states
export interface CameraTransition {
  from: CameraState;
  to: CameraTarget;
  duration: number;
  distance: number;
  easingProfile: EasingProfile;
}
