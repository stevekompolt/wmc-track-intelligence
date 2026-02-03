import type { CameraState } from '@/types/viewpoint';
import type { 
  CameraTarget, 
  EasingProfile, 
  CameraConstraints,
  TargetEngine,
  LookAtTarget,
  OrbitConfig,
} from '@/types/camera';

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

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
 * Normalize pitch for target rendering engine
 * 
 * Mapbox GL JS: 0° = horizon, 85° = looking down (positive values)
 * Cesium: 0° = horizon, -90° = looking down (negative values)
 * 
 * Input pitch uses Cesium convention (negative = looking down)
 * Output is normalized for the target engine
 */
export function normalizePitch(
  pitch: number, 
  targetEngine: TargetEngine,
  constraints?: { maxPitch: number }
): number {
  const maxPitch = constraints?.maxPitch || 75;
  
  // Clamp to safe range first (Cesium convention: -75 to -5)
  const clampedPitch = Math.max(-maxPitch, Math.min(-5, pitch));
  
  if (targetEngine === 'cesium') {
    // Cesium uses negative pitch directly
    return clampedPitch;
  } else {
    // Mapbox uses positive pitch (0-85)
    // Convert: -45° Cesium → 45° Mapbox
    return Math.abs(clampedPitch);
  }
}

/**
 * Convert pitch from one engine convention to another
 */
export function convertPitch(
  pitch: number,
  fromEngine: TargetEngine,
  toEngine: TargetEngine
): number {
  if (fromEngine === toEngine) return pitch;
  
  // Mapbox → Cesium: negate
  // Cesium → Mapbox: absolute value
  if (fromEngine === 'mapbox') {
    return -Math.abs(pitch);
  } else {
    return Math.abs(pitch);
  }
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

/**
 * Calculate camera position for orbiting around a target
 * 
 * @param target - The point to orbit around
 * @param distance - Distance from target in meters
 * @param baseHeading - Starting heading in degrees
 * @param arcProgress - Progress through the arc (0-1)
 * @param config - Orbit configuration
 * @returns Camera position and heading to look at target
 */
export function calculateOrbitPosition(
  target: LookAtTarget,
  distance: number,
  baseHeading: number,
  arcProgress: number,
  config: OrbitConfig
): { latitude: number; longitude: number; heading: number } {
  // Calculate arc offset based on progress and direction
  const arcOffset = arcProgress * config.maxArc * (config.direction === 'cw' ? 1 : -1);
  const currentHeading = baseHeading + arcOffset;
  
  // Convert distance from meters to approximate degrees
  // 1 degree latitude ≈ 111km
  const distanceInDegrees = distance / 111000;
  
  // Calculate camera position on the arc
  const headingRad = toRadians(currentHeading);
  const cameraLat = target.latitude + Math.cos(headingRad) * distanceInDegrees;
  const cameraLon = target.longitude + Math.sin(headingRad) * distanceInDegrees;
  
  // Camera heading points at target (opposite of position heading)
  const cameraHeading = (currentHeading + 180) % 360;
  
  return {
    latitude: cameraLat,
    longitude: cameraLon,
    heading: cameraHeading,
  };
}

/**
 * Calculate the range (distance) from camera to target for lookAt
 * 
 * @param cameraHeight - Camera height/altitude in meters
 * @param pitch - Camera pitch in degrees (Cesium convention: negative = looking down)
 * @returns Distance to target in meters
 */
export function calculateRangeFromPitch(
  cameraHeight: number,
  pitch: number
): number {
  // pitch is negative (looking down), so we use absolute value
  const pitchRad = toRadians(Math.abs(pitch));
  
  // Simple trigonometry: range = height / sin(pitch)
  // Add safety check for very shallow angles
  if (pitchRad < 0.1) {
    return cameraHeight * 10; // Reasonable max range
  }
  
  return cameraHeight / Math.sin(pitchRad);
}

/**
 * Validate and clamp camera state values
 */
export function clampCameraValues(
  state: Partial<CameraState>,
  constraints: CameraConstraints
): Partial<CameraState> {
  return {
    ...state,
    pitch: state.pitch !== undefined 
      ? Math.max(-constraints.maxPitch, Math.min(-5, state.pitch))
      : undefined,
    roll: state.roll !== undefined
      ? Math.max(-constraints.maxRoll, Math.min(constraints.maxRoll, state.roll))
      : undefined,
    height: state.height !== undefined
      ? Math.max(constraints.minZoom, Math.min(constraints.maxZoom, state.height))
      : undefined,
  };
}
