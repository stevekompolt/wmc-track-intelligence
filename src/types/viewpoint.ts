// App modes for context-aware behavior
export type AppMode = 'editor' | 'ops' | 'media' | 'fan';

// Semantic icon keys for viewpoint buttons
export type IconKey = 
  | 'camera' 
  | 'drone' 
  | 'flag' 
  | 'pit' 
  | 'map' 
  | 'shield' 
  | 'broadcast' 
  | 'cube' 
  | 'none';

// Live camera state captured from map
export interface CameraState {
  latitude: number;
  longitude: number;
  height: number; // zoom level
  heading: number; // bearing in degrees
  pitch: number; // tilt in degrees
  roll: number; // always 0 for Mapbox
}

// Junction record linking viewpoint to app mode
export interface ViewpointMode {
  id: string;
  viewpointId: string;
  mode: AppMode;
  isDefault: boolean;
  priority: number;
  visible: boolean;
}

// Main viewpoint entity - camera snapshot with metadata
export interface Viewpoint {
  id: string;
  name: string;
  venueId: string;
  description?: string;
  
  // Camera parameters
  latitude: number;
  longitude: number;
  height: number; // zoom
  heading: number; // bearing
  pitch: number;
  roll: number;
  
  // UI & visibility
  buttonIcon: IconKey;
  priority: number;
  status: 'draft' | 'published';
  
  // Audience visibility flags
  visibleToFans: boolean;
  visibleToMedia: boolean;
  visibleToOps: boolean;
  
  // Mode associations
  modes: ViewpointMode[];
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// Form data for creating/editing viewpoints
export interface ViewpointFormData {
  name: string;
  description?: string;
  buttonIcon: IconKey;
  priority: number;
  status: 'draft' | 'published';
  visibleToFans: boolean;
  visibleToMedia: boolean;
  visibleToOps: boolean;
  modes: AppMode[];
  camera: CameraState;
}
