import type { Viewpoint, ViewpointFormData, CameraState, AppMode } from '@/types/viewpoint';

// Mock viewpoints data for demonstration
const MOCK_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'vp-1',
    name: 'Start/Finish Line',
    venueId: 'track-1', // UMC
    description: 'Main grandstand view of the start/finish line',
    latitude: 40.5855,
    longitude: -111.8825,
    height: 16,
    heading: 45,
    pitch: 50,
    roll: 0,
    buttonIcon: 'flag',
    priority: 1,
    status: 'published',
    visibleToFans: true,
    visibleToMedia: true,
    visibleToOps: true,
    modes: [
      { id: 'vm-1a', viewpointId: 'vp-1', mode: 'editor', isDefault: true, priority: 1, visible: true },
      { id: 'vm-1b', viewpointId: 'vp-1', mode: 'ops', isDefault: true, priority: 1, visible: true },
      { id: 'vm-1c', viewpointId: 'vp-1', mode: 'media', isDefault: false, priority: 2, visible: true },
      { id: 'vm-1d', viewpointId: 'vp-1', mode: 'fan', isDefault: true, priority: 1, visible: true },
    ],
  },
  {
    id: 'vp-2',
    name: 'Pit Lane Overview',
    venueId: 'track-1',
    description: 'Elevated view of the pit lane and paddock area',
    latitude: 40.5848,
    longitude: -111.8830,
    height: 17,
    heading: 120,
    pitch: 45,
    roll: 0,
    buttonIcon: 'pit',
    priority: 2,
    status: 'published',
    visibleToFans: false,
    visibleToMedia: true,
    visibleToOps: true,
    modes: [
      { id: 'vm-2a', viewpointId: 'vp-2', mode: 'editor', isDefault: false, priority: 2, visible: true },
      { id: 'vm-2b', viewpointId: 'vp-2', mode: 'ops', isDefault: false, priority: 2, visible: true },
      { id: 'vm-2c', viewpointId: 'vp-2', mode: 'media', isDefault: true, priority: 1, visible: true },
    ],
  },
  {
    id: 'vp-3',
    name: 'Turn 1 Entry',
    venueId: 'track-1',
    description: 'Camera angle for Turn 1 braking zone',
    latitude: 40.5862,
    longitude: -111.8815,
    height: 15,
    heading: 200,
    pitch: 35,
    roll: 0,
    buttonIcon: 'camera',
    priority: 3,
    status: 'published',
    visibleToFans: true,
    visibleToMedia: true,
    visibleToOps: false,
    modes: [
      { id: 'vm-3a', viewpointId: 'vp-3', mode: 'editor', isDefault: false, priority: 3, visible: true },
      { id: 'vm-3b', viewpointId: 'vp-3', mode: 'media', isDefault: false, priority: 3, visible: true },
      { id: 'vm-3c', viewpointId: 'vp-3', mode: 'fan', isDefault: false, priority: 2, visible: true },
    ],
  },
  {
    id: 'vp-4',
    name: 'Aerial View',
    venueId: 'track-1',
    description: 'Drone-style overview of entire track',
    latitude: 40.5850,
    longitude: -111.8820,
    height: 14,
    heading: 0,
    pitch: 60,
    roll: 0,
    buttonIcon: 'drone',
    priority: 4,
    status: 'published',
    visibleToFans: true,
    visibleToMedia: true,
    visibleToOps: true,
    modes: [
      { id: 'vm-4a', viewpointId: 'vp-4', mode: 'editor', isDefault: false, priority: 4, visible: true },
      { id: 'vm-4b', viewpointId: 'vp-4', mode: 'ops', isDefault: false, priority: 3, visible: true },
      { id: 'vm-4c', viewpointId: 'vp-4', mode: 'media', isDefault: false, priority: 4, visible: true },
      { id: 'vm-4d', viewpointId: 'vp-4', mode: 'fan', isDefault: false, priority: 3, visible: true },
    ],
  },
  {
    id: 'vp-5',
    name: 'Broadcast Tower',
    venueId: 'track-1',
    description: 'Main broadcast camera position',
    latitude: 40.5845,
    longitude: -111.8835,
    height: 16,
    heading: 90,
    pitch: 40,
    roll: 0,
    buttonIcon: 'broadcast',
    priority: 5,
    status: 'published',
    visibleToFans: false,
    visibleToMedia: true,
    visibleToOps: false,
    modes: [
      { id: 'vm-5a', viewpointId: 'vp-5', mode: 'media', isDefault: false, priority: 5, visible: true },
    ],
  },
  // Laguna Seca viewpoints
  {
    id: 'vp-6',
    name: 'Corkscrew',
    venueId: 'track-2',
    description: 'Famous Corkscrew turn overview',
    latitude: 36.5850,
    longitude: -121.7540,
    height: 16,
    heading: 180,
    pitch: 45,
    roll: 0,
    buttonIcon: 'camera',
    priority: 1,
    status: 'published',
    visibleToFans: true,
    visibleToMedia: true,
    visibleToOps: true,
    modes: [
      { id: 'vm-6a', viewpointId: 'vp-6', mode: 'editor', isDefault: true, priority: 1, visible: true },
      { id: 'vm-6b', viewpointId: 'vp-6', mode: 'ops', isDefault: true, priority: 1, visible: true },
      { id: 'vm-6c', viewpointId: 'vp-6', mode: 'media', isDefault: true, priority: 1, visible: true },
      { id: 'vm-6d', viewpointId: 'vp-6', mode: 'fan', isDefault: true, priority: 1, visible: true },
    ],
  },
];

// In-memory store for created viewpoints
let viewpointsStore = [...MOCK_VIEWPOINTS];
let nextId = 7;

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all viewpoints for a venue
export async function fetchViewpoints(venueId: string): Promise<Viewpoint[]> {
  await delay(300);
  return viewpointsStore.filter(vp => vp.venueId === venueId);
}

// Create a new viewpoint
export async function createViewpoint(
  venueId: string,
  data: ViewpointFormData
): Promise<Viewpoint> {
  await delay(400);
  
  const newViewpoint: Viewpoint = {
    id: `vp-${nextId++}`,
    name: data.name,
    venueId,
    description: data.description,
    latitude: data.camera.latitude,
    longitude: data.camera.longitude,
    height: data.camera.height,
    heading: data.camera.heading,
    pitch: data.camera.pitch,
    roll: data.camera.roll,
    buttonIcon: data.buttonIcon,
    priority: data.priority,
    status: data.status,
    visibleToFans: data.visibleToFans,
    visibleToMedia: data.visibleToMedia,
    visibleToOps: data.visibleToOps,
    modes: data.modes.map((mode, idx) => ({
      id: `vm-${nextId}-${idx}`,
      viewpointId: `vp-${nextId - 1}`,
      mode,
      isDefault: false,
      priority: data.priority,
      visible: true,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  viewpointsStore.push(newViewpoint);
  return newViewpoint;
}

// Update an existing viewpoint
export async function updateViewpoint(
  id: string,
  data: Partial<ViewpointFormData>
): Promise<Viewpoint> {
  await delay(300);
  
  const index = viewpointsStore.findIndex(vp => vp.id === id);
  if (index === -1) {
    throw new Error(`Viewpoint ${id} not found`);
  }
  
  const existing = viewpointsStore[index];
  const updated: Viewpoint = {
    ...existing,
    ...(data.name && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.buttonIcon && { buttonIcon: data.buttonIcon }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.status && { status: data.status }),
    ...(data.visibleToFans !== undefined && { visibleToFans: data.visibleToFans }),
    ...(data.visibleToMedia !== undefined && { visibleToMedia: data.visibleToMedia }),
    ...(data.visibleToOps !== undefined && { visibleToOps: data.visibleToOps }),
    ...(data.camera && {
      latitude: data.camera.latitude,
      longitude: data.camera.longitude,
      height: data.camera.height,
      heading: data.camera.heading,
      pitch: data.camera.pitch,
      roll: data.camera.roll,
    }),
    updatedAt: new Date().toISOString(),
  };
  
  // Update modes if provided
  if (data.modes) {
    updated.modes = data.modes.map((mode, idx) => ({
      id: `vm-${id}-${idx}`,
      viewpointId: id,
      mode,
      isDefault: false,
      priority: data.priority ?? existing.priority,
      visible: true,
    }));
  }
  
  viewpointsStore[index] = updated;
  return updated;
}

// Delete a viewpoint
export async function deleteViewpoint(id: string): Promise<void> {
  await delay(200);
  viewpointsStore = viewpointsStore.filter(vp => vp.id !== id);
}

// Convert Mapbox camera to CameraState
export function mapboxToCameraState(
  center: { lng: number; lat: number },
  zoom: number,
  bearing: number,
  pitch: number
): CameraState {
  return {
    latitude: center.lat,
    longitude: center.lng,
    height: zoom,
    heading: bearing,
    pitch,
    roll: 0,
  };
}
