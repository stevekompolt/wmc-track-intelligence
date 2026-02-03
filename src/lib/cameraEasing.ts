import type { CameraState } from '@/types/viewpoint';
import type { 
  CameraTarget, 
  EasingProfile, 
  CameraConstraints,
  DEFAULT_EASING_PROFILE,
  DEFAULT_CAMERA_CONSTRAINTS 
} from '@/types/camera';

/**
 * Calculate great circle distance between two points (in km)
 */
export function greatCircleDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate duration based on distance (6-10 seconds)
 */
export function calculateDuration(distanceKm: number): number {
  const minDuration = 6000; // 6 seconds
  const maxDuration = 10000; // 10 seconds
  
  // Scale: 0km = 6s, 100km+ = 10s
  const normalized = Math.min(distanceKm / 100, 1);
  return minDuration + normalized * (maxDuration - minDuration);
}

/**
 * Cubic bezier ease-in curve
 */
function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Cubic bezier ease-out curve
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 3-phase cinematic easing function
 * Phase 1 (0-20%): Ease-in
 * Phase 2 (20-80%): Steady glide
 * Phase 3 (80-100%): Ease-out
 */
export function cinematicEase(
  t: number, 
  profile: EasingProfile = {
    easeInPercent: 0.20,
    glidePercent: 0.60,
    easeOutPercent: 0.20,
  }
): number {
  const { easeInPercent, glidePercent, easeOutPercent } = profile;
  
  // Normalize to ensure they sum to 1
  const total = easeInPercent + glidePercent + easeOutPercent;
  const p1 = easeInPercent / total;
  const p2 = p1 + glidePercent / total;
  
  if (t < p1) {
    // Phase 1: Ease-in
    const localT = t / p1;
    return easeInCubic(localT) * p1;
  } else if (t < p2) {
    // Phase 2: Linear glide
    return t;
  } else {
    // Phase 3: Ease-out
    const localT = (t - p2) / (1 - p2);
    const easeOutValue = easeOutCubic(localT);
    return p2 + easeOutValue * (1 - p2);
  }
}

/**
 * Calculate subtle cinematic tilt during camera movement
 * Returns offset in degrees (peaks at 50% progress)
 */
export function calculateCinematicTilt(progress: number): number {
  const maxTilt = 3; // 3 degrees peak
  // Sine wave peaks at 50%
  return maxTilt * Math.sin(progress * Math.PI);
}

/**
 * Interpolate between two camera states
 */
export function interpolateCamera(
  start: CameraState,
  end: CameraState,
  t: number,
  constraints: CameraConstraints = {
    minZoom: 8,
    maxZoom: 20,
    maxPitch: 75,
    maxRoll: 5,
  }
): CameraState {
  // Linear interpolation helper
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  
  // Interpolate heading with shortest path (handle 360° wrap)
  const headingDiff = ((end.heading - start.heading + 540) % 360) - 180;
  const interpolatedHeading = (start.heading + headingDiff * t + 360) % 360;
  
  // Calculate cinematic tilt offset
  const tiltOffset = calculateCinematicTilt(t);
  
  // Interpolate with constraints
  const height = lerp(start.height, end.height, t);
  const pitch = lerp(start.pitch, end.pitch, t) + tiltOffset;
  const roll = lerp(start.roll, end.roll, t);
  
  return {
    latitude: lerp(start.latitude, end.latitude, t),
    longitude: lerp(start.longitude, end.longitude, t),
    height: Math.max(constraints.minZoom, Math.min(constraints.maxZoom, height)),
    heading: interpolatedHeading,
    pitch: Math.max(-constraints.maxPitch, Math.min(constraints.maxPitch, pitch)),
    roll: Math.max(-constraints.maxRoll, Math.min(constraints.maxRoll, roll)),
  };
}

/**
 * Calculate drift offset using sine waves
 */
export function calculateDriftOffset(
  elapsed: number,
  headingAmplitude: number = 2,
  headingPeriod: number = 20000,
  pitchAmplitude: number = 1,
  pitchPeriod: number = 15000
): { heading: number; pitch: number } {
  return {
    heading: headingAmplitude * Math.sin((elapsed / headingPeriod) * 2 * Math.PI),
    pitch: pitchAmplitude * Math.sin((elapsed / pitchPeriod) * 2 * Math.PI),
  };
}

/**
 * Blend from current position to new target (for interruption handling)
 */
export function blendCameraStates(
  current: CameraState,
  target: CameraTarget,
  blendFactor: number = 0.1
): CameraState {
  return interpolateCamera(current, target, blendFactor);
}
