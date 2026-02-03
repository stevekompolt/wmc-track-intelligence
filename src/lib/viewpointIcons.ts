import {
  Camera,
  Plane,
  Flag,
  Wrench,
  Map,
  Shield,
  Radio,
  Box,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey } from '@/types/viewpoint';

// Map semantic icon keys to Lucide icons
export const viewpointIconMap: Record<IconKey, LucideIcon> = {
  camera: Camera,
  drone: Plane,
  flag: Flag,
  pit: Wrench,
  map: Map,
  shield: Shield,
  broadcast: Radio,
  cube: Box,
  none: Circle,
};

// Get icon component by key
export function getViewpointIcon(key: IconKey): LucideIcon {
  return viewpointIconMap[key] || Circle;
}

// Icon options for select dropdowns
export const iconOptions: { value: IconKey; label: string }[] = [
  { value: 'camera', label: 'Camera' },
  { value: 'drone', label: 'Drone / Aerial' },
  { value: 'flag', label: 'Flag / Checkpoint' },
  { value: 'pit', label: 'Pit Lane' },
  { value: 'map', label: 'Map Overview' },
  { value: 'shield', label: 'Safety / Security' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'cube', label: '3D View' },
  { value: 'none', label: 'Default' },
];
