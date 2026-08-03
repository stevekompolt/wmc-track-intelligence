// Map Overlay Types for 2D Ground Overlay Editor

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type OverlayStatus = 'draft' | 'published' | 'archived';

// Snapping source options
export type SnapSource = 
  | 'none'           // Free placement
  | 'venue_bounds'   // Track center + configurable span
  | 'geometry'       // Target polygon bounding box
  | 'element'        // Target venue element bounds
  | 'viewpoint'      // Frame from viewpoint camera
  | 'previous'       // Copy from another overlay
  | 'image_metadata'; // Extract geo from image EXIF

export interface MapOverlay {
  id: string;
  venueId: string;
  name: string;
  description?: string;
  
  // Binary asset — owned by the media system (Wasabi). `mediaAssetId` is the
  // permanent reference; `imageUrl` is the resolved CDN URL and is never
  // persisted (no base64, no blob URLs).
  mediaAssetId?: string | null;
  s3Key?: string | null;
  organizationId?: string | null;
  eventId?: string | null;
  imageUrl: string;
  
  // Placement
  boundingBox: BoundingBox;
  
  // Snapping
  snapSource: SnapSource;
  targetElementId?: string;
  targetGeometryId?: string;
  targetViewpointId?: string;
  autoFitOnLoad: boolean;
  rotation: number; // 0-360 degrees
  rotationDegrees?: number;
  
  // Visual
  opacity: number; // 0-1
  zOrder: number;
  
  // Visibility
  visibleToFans: boolean;
  visibleToMedia: boolean;
  visibleToOps: boolean;
  
  // Status
  status: OverlayStatus;
  isLocked: boolean;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface OverlayEditorState {
  overlay: MapOverlay | null;
  isDirty: boolean;
  isEditing: boolean;
  dragMode: 'none' | 'corners' | 'move';
  activeCorner: CornerHandle | null;
  lastSaved: Date | null;
  undoStack: MapOverlay[];
  // Ghost preview for snapping
  ghostBounds: BoundingBox | null;
  isPreviewingSnap: boolean;
}

export type CornerHandle = 'nw' | 'ne' | 'sw' | 'se';

export interface OverlayDragEvent {
  corner?: CornerHandle;
  latitude: number;
  longitude: number;
}

// Venue coordinates for snapping
export interface VenueCoords {
  lat: number;
  lng: number;
}

// Default overlay for new creation
export function createDefaultOverlay(venueId: string): MapOverlay {
  return {
    id: crypto.randomUUID(),
    venueId,
    name: 'New Overlay',
    description: '',
    mediaAssetId: null,
    s3Key: null,
    imageUrl: '',
    boundingBox: {
      north: 0,
      south: 0,
      east: 0,
      west: 0,
    },
    snapSource: 'venue_bounds', // Default to auto-snap
    autoFitOnLoad: true,
    rotation: 0,
    opacity: 0.85,
    zOrder: 0,
    visibleToFans: true,
    visibleToMedia: false,
    visibleToOps: true,
    status: 'draft',
    isLocked: false,
  };
}

// Validate bounding box
export function isValidBoundingBox(box: BoundingBox): boolean {
  return (
    box.north > box.south &&
    box.east > box.west &&
    box.north >= -90 && box.north <= 90 &&
    box.south >= -90 && box.south <= 90 &&
    box.east >= -180 && box.east <= 180 &&
    box.west >= -180 && box.west <= 180
  );
}

// Calculate center of bounding box
export function getBoundingBoxCenter(box: BoundingBox): { lat: number; lng: number } {
  return {
    lat: (box.north + box.south) / 2,
    lng: (box.east + box.west) / 2,
  };
}

// Calculate snap bounds from venue center and aspect ratio
export function calculateSnapBounds(
  venue: VenueCoords,
  aspectRatio: number = 1,
  span: number = 0.015,
  padding: number = 1.0
): BoundingBox {
  const latSpan = span;
  const lngSpan = span * aspectRatio;
  
  return {
    north: venue.lat + (latSpan / 2) * padding,
    south: venue.lat - (latSpan / 2) * padding,
    east: venue.lng + (lngSpan / 2) * padding,
    west: venue.lng - (lngSpan / 2) * padding,
  };
}

// Get image aspect ratio
export async function getImageAspectRatio(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => resolve(1); // fallback to square
    img.src = url;
  });
}
