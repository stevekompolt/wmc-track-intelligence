import type { PitchPreset, SceneType, EasingProfile, CameraConstraints } from '@/types/camera';

/**
 * Pitch range presets for different scene types
 * Values are in degrees (Cesium convention: 0 = horizon, negative = looking down)
 */
export interface PitchPresetConfig {
  minPitch: number;  // More negative = looking more down
  maxPitch: number;  // Less negative = closer to horizon
  recommendedPitch: number;
  duration: number;  // Recommended duration in ms
  description: string;
}

/**
 * Scene-specific camera presets
 * Pitch values use Cesium convention (negative = looking down)
 */
export const CAMERA_PRESETS: Record<PitchPreset, PitchPresetConfig> = {
  aerial_reveal: {
    minPitch: -35,
    maxPitch: -20,
    recommendedPitch: -28,
    duration: 10000,
    description: 'Wide establishing shot from above',
  },
  track_follow: {
    minPitch: -25,
    maxPitch: -10,
    recommendedPitch: -18,
    duration: 8000,
    description: 'Following action along the track',
  },
  grandstand_pov: {
    minPitch: -15,
    maxPitch: -5,
    recommendedPitch: -10,
    duration: 8000,
    description: 'Fan perspective from the stands',
  },
  overhead: {
    minPitch: -65,
    maxPitch: -45,
    recommendedPitch: -55,
    duration: 12000,
    description: 'Cinematic bird\'s eye view',
  },
};

/**
 * Get pitch from preset, clamped to preset range
 */
export function getPitchFromPreset(
  preset: PitchPreset,
  customPitch?: number
): number {
  const config = CAMERA_PRESETS[preset];
  
  if (customPitch !== undefined) {
    // Clamp custom pitch to preset range
    return Math.max(config.minPitch, Math.min(config.maxPitch, customPitch));
  }
  
  return config.recommendedPitch;
}

/**
 * Get recommended duration from preset
 */
export function getDurationFromPreset(preset: PitchPreset): number {
  return CAMERA_PRESETS[preset].duration;
}

/**
 * Validate pitch is within safe cinematic range
 * Returns true if pitch is acceptable for Fan Preview
 */
export function isValidCinematicPitch(pitch: number): boolean {
  // Fan Preview should never exceed -75° (becomes map-like)
  // and should be at least -5° (too flat feels wrong)
  return pitch >= -75 && pitch <= -5;
}

/**
 * Cinematic easing presets for different transition styles
 */
export const EASING_PRESETS: Record<string, EasingProfile> = {
  standard: {
    easeInPercent: 0.20,
    glidePercent: 0.60,
    easeOutPercent: 0.20,
  },
  dramatic: {
    easeInPercent: 0.30,
    glidePercent: 0.40,
    easeOutPercent: 0.30,
  },
  smooth: {
    easeInPercent: 0.15,
    glidePercent: 0.70,
    easeOutPercent: 0.15,
  },
  quick: {
    easeInPercent: 0.10,
    glidePercent: 0.80,
    easeOutPercent: 0.10,
  },
};

/**
 * Camera constraints by mode
 */
export const MODE_CONSTRAINTS: Record<string, CameraConstraints> = {
  fan: {
    minZoom: 10,
    maxZoom: 18,
    maxPitch: 75,
    maxRoll: 3,  // Very limited roll for stability
  },
  editor: {
    minZoom: 8,
    maxZoom: 20,
    maxPitch: 85,
    maxRoll: 5,
  },
  media: {
    minZoom: 10,
    maxZoom: 20,
    maxPitch: 80,
    maxRoll: 5,
  },
};

/**
 * Get constraints for a specific mode
 */
export function getConstraintsForMode(mode: string): CameraConstraints {
  return MODE_CONSTRAINTS[mode] || MODE_CONSTRAINTS.editor;
}
