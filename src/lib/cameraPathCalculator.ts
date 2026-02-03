import type { CameraState } from '@/types/viewpoint';
import type { 
  CameraTarget, 
  CameraTransition, 
  EasingProfile,
  DEFAULT_EASING_PROFILE 
} from '@/types/camera';
import { greatCircleDistance, calculateDuration } from './cameraEasing';

// Default camera values for fallbacks
const DEFAULT_CAMERA: CameraState = {
  latitude: 40.5,
  longitude: -111.9,
  height: 14,
  heading: 0,
  pitch: 45,
  roll: 0,
};

/**
 * Validate viewpoint and apply fallbacks for missing data
 */
export function validateViewpoint(
  viewpoint: Partial<CameraTarget>,
  venueCentroid?: { lat: number; lng: number }
): CameraTarget {
  const warnings: string[] = [];
  
  // Use venue centroid or defaults for missing coordinates
  let latitude = viewpoint.latitude;
  let longitude = viewpoint.longitude;
  
  if (latitude === undefined || longitude === undefined) {
    if (venueCentroid) {
      latitude = venueCentroid.lat;
      longitude = venueCentroid.lng;
      warnings.push('Using venue centroid for missing coordinates');
    } else {
      latitude = DEFAULT_CAMERA.latitude;
      longitude = DEFAULT_CAMERA.longitude;
      warnings.push('Using default coordinates');
    }
  }
  
  // Apply defaults for missing camera parameters
  const validated: CameraTarget = {
    latitude,
    longitude,
    height: viewpoint.height ?? DEFAULT_CAMERA.height,
    heading: viewpoint.heading ?? DEFAULT_CAMERA.heading,
    pitch: viewpoint.pitch ?? DEFAULT_CAMERA.pitch,
    roll: viewpoint.roll ?? DEFAULT_CAMERA.roll,
    boundingBox: viewpoint.boundingBox,
    targetElement: viewpoint.targetElement,
    sceneType: viewpoint.sceneType ?? 'standard',
  };
  
  // Log warnings silently
  if (warnings.length > 0) {
    console.warn('[CameraPath] Viewpoint validation:', warnings.join(', '));
  }
  
  return validated;
}

/**
 * Calculate camera position to frame a bounding box
 */
export function frameBoundingBox(
  bbox: [[number, number], [number, number]],
  padding: number = 0.1
): Partial<CameraState> {
  const [[swLng, swLat], [neLng, neLat]] = bbox;
  
  // Calculate center
  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;
  
  // Calculate span with padding
  const latSpan = Math.abs(neLat - swLat) * (1 + padding);
  const lngSpan = Math.abs(neLng - swLng) * (1 + padding);
  
  // Estimate zoom level (rough approximation)
  const maxSpan = Math.max(latSpan, lngSpan);
  const zoom = Math.max(8, Math.min(18, 12 - Math.log2(maxSpan * 100)));
  
  return {
    latitude: centerLat,
    longitude: centerLng,
    height: zoom,
  };
}

/**
 * Pre-calculate transition between two camera states
 */
export function calculateTransition(
  from: CameraState,
  to: CameraTarget,
  easingProfile: EasingProfile = {
    easeInPercent: 0.20,
    glidePercent: 0.60,
    easeOutPercent: 0.20,
  }
): CameraTransition {
  // If target has bounding box, frame it first
  let targetState = { ...to };
  if (to.boundingBox) {
    const framed = frameBoundingBox(to.boundingBox);
    targetState = {
      ...targetState,
      ...framed,
    };
  }
  
  // Calculate distance
  const distance = greatCircleDistance(
    from.latitude,
    from.longitude,
    targetState.latitude,
    targetState.longitude
  );
  
  // Calculate duration based on distance
  const duration = calculateDuration(distance);
  
  return {
    from,
    to: targetState,
    duration,
    distance,
    easingProfile,
  };
}

/**
 * Pre-calculate all transitions for a tour
 */
export function calculateTourPath(
  viewpoints: CameraTarget[],
  venueCentroid?: { lat: number; lng: number }
): CameraTransition[] {
  if (viewpoints.length === 0) return [];
  
  // Validate all viewpoints
  const validated = viewpoints.map(vp => validateViewpoint(vp, venueCentroid));
  
  // Calculate transitions between consecutive viewpoints
  const transitions: CameraTransition[] = [];
  
  for (let i = 0; i < validated.length - 1; i++) {
    const from = validated[i];
    const to = validated[i + 1];
    
    // Adjust easing for final scene
    const easingProfile = to.sceneType === 'final' 
      ? { easeInPercent: 0.15, glidePercent: 0.55, easeOutPercent: 0.30 }
      : { easeInPercent: 0.20, glidePercent: 0.60, easeOutPercent: 0.20 };
    
    transitions.push(calculateTransition(from, to, easingProfile));
  }
  
  return transitions;
}

/**
 * Calculate heading from one point to another
 */
export function calculateHeading(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const lat1 = fromLat * Math.PI / 180;
  const lat2 = toLat * Math.PI / 180;
  
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  const heading = Math.atan2(x, y) * 180 / Math.PI;
  return (heading + 360) % 360;
}
