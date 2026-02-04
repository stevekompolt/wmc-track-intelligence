// Feature type definitions for venue spatial data

export type FeatureType = 'point' | 'line' | 'polygon';

export type DrawingMode = 'none' | 'point' | 'line' | 'polygon';

export type GeometryEditMode = 'none' | 'editing';

export type FeatureStatus = 'draft' | 'published';

export type IconKey = 
  | 'none'
  | 'flag'
  | 'camera'
  | 'car'
  | 'warning'
  | 'info'
  | 'star'
  | 'medical'
  | 'fuel'
  | 'food'
  | 'parking';

export interface FeatureStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
  fillColor: string;
  fillOpacity: number;
  icon: IconKey;
  iconSize: number;
}

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LineGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [[lng, lat], ...]
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[[lng, lat], ...]]
}

export type FeatureGeometry = PointGeometry | LineGeometry | PolygonGeometry;

export interface VenueFeature {
  id: string;
  venueId: string;
  type: FeatureType;
  name: string;
  description: string;
  geometry: FeatureGeometry;
  style: FeatureStyle;
  visibleToFans: boolean;
  visibleToMedia: boolean;
  visibleToOps: boolean;
  status: FeatureStatus;
  zOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingState {
  mode: DrawingMode;
  partialCoords: [number, number][];
  isDrawing: boolean;
}

// Default style for new features
export const DEFAULT_FEATURE_STYLE: FeatureStyle = {
  color: '#3B82F6',
  opacity: 0.8,
  strokeWidth: 2,
  fillColor: '#3B82F6',
  fillOpacity: 0.3,
  icon: 'none',
  iconSize: 1,
};

// Color presets for feature styling
export const FEATURE_COLORS = [
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// Icon options for point features
export const FEATURE_ICONS: { key: IconKey; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'flag', label: 'Flag' },
  { key: 'camera', label: 'Camera' },
  { key: 'car', label: 'Vehicle' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
  { key: 'star', label: 'Star' },
  { key: 'medical', label: 'Medical' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'food', label: 'Food' },
  { key: 'parking', label: 'Parking' },
];
