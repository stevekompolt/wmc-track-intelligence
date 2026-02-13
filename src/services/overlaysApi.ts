// Mock API for map overlays with localStorage persistence

import type { MapOverlay, SnapSource } from '@/types/overlay';
import { createDefaultOverlay } from '@/types/overlay';

const STORAGE_KEY = 'venue-overlays';

// Generate unique ID
const generateId = (): string => {
  return `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Load overlays from localStorage
const loadOverlays = (): MapOverlay[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('Failed to load overlays from localStorage');
    return [];
  }
};

// Save overlays to localStorage
const saveOverlays = (overlays: MapOverlay[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
    return true;
  } catch (e) {
    console.error('Failed to save overlays to localStorage:', e);
    return false;
  }
};

// Get all overlays for a venue
export const getOverlaysByVenue = async (venueId: string): Promise<MapOverlay[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const allOverlays = loadOverlays();
  return allOverlays.filter(o => o.venueId === venueId);
};

// Get a single overlay by ID
export const getOverlayById = async (overlayId: string): Promise<MapOverlay | null> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  const allOverlays = loadOverlays();
  return allOverlays.find(o => o.id === overlayId) || null;
};

// Create a new overlay
export const createOverlay = async (
  venueId: string,
  name?: string
): Promise<MapOverlay> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allOverlays = loadOverlays();
  const venueOverlays = allOverlays.filter(o => o.venueId === venueId);
  const maxZOrder = venueOverlays.reduce((max, o) => Math.max(max, o.zOrder), 0);
  
  const now = new Date().toISOString();
  const defaultName = name || `Overlay ${venueOverlays.length + 1}`;
  
  const overlay: MapOverlay = {
    ...createDefaultOverlay(venueId),
    id: generateId(),
    name: defaultName,
    zOrder: maxZOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  
  allOverlays.push(overlay);
  saveOverlays(allOverlays);
  
  return overlay;
};

// Update an existing overlay
export const updateOverlay = async (
  overlayId: string,
  updates: Partial<Omit<MapOverlay, 'id' | 'venueId' | 'createdAt'>>
): Promise<MapOverlay | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allOverlays = loadOverlays();
  const index = allOverlays.findIndex(o => o.id === overlayId);
  
  if (index === -1) return null;
  
  const updatedOverlay: MapOverlay = {
    ...allOverlays[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  allOverlays[index] = updatedOverlay;
  
  if (!saveOverlays(allOverlays)) {
    // If save failed (e.g. quota exceeded with large data URLs),
    // try saving without imageUrl data URLs to preserve other changes
    console.warn('localStorage save failed, attempting without large data URLs');
    const compactOverlays = allOverlays.map(o => ({
      ...o,
      // Keep data URLs in memory but don't re-serialize if they're too large
    }));
    saveOverlays(compactOverlays);
  }
  
  return updatedOverlay;
};

// Delete an overlay
export const deleteOverlay = async (overlayId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allOverlays = loadOverlays();
  const index = allOverlays.findIndex(o => o.id === overlayId);
  
  if (index === -1) return false;
  
  allOverlays.splice(index, 1);
  saveOverlays(allOverlays);
  
  return true;
};

// Reorder overlay z-index
export const reorderOverlay = async (
  overlayId: string,
  newZOrder: number
): Promise<MapOverlay | null> => {
  return updateOverlay(overlayId, { zOrder: newZOrder });
};
