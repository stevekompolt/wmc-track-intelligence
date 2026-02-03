// Map Overlay Types for 2D Ground Overlay Editor

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type OverlayStatus = 'draft' | 'published' | 'archived';

export interface MapOverlay {
  id: string;
  venueId: string;
  name: string;
  description?: string;
  
  // Image
  imageUrl: string;
  
  // Placement
  boundingBox: BoundingBox;
  
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
}

export type CornerHandle = 'nw' | 'ne' | 'sw' | 'se';

export interface OverlayDragEvent {
  corner?: CornerHandle;
  latitude: number;
  longitude: number;
}

// Default overlay for new creation
export function createDefaultOverlay(venueId: string): MapOverlay {
  return {
    id: crypto.randomUUID(),
    venueId,
    name: 'New Overlay',
    description: '',
    imageUrl: '',
    boundingBox: {
      north: 0,
      south: 0,
      east: 0,
      west: 0,
    },
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
