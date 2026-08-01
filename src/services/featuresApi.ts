// Mock API for venue features with localStorage persistence

import type { VenueFeature, FeatureType, FeatureGeometry, FeatureStyle, DEFAULT_FEATURE_STYLE } from '@/types/feature';

const STORAGE_KEY = 'venue-features';

// Generate unique ID
const generateId = (): string => {
  return `feat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Load features from localStorage
const loadFeatures = (): VenueFeature[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('Failed to load features from localStorage');
    return [];
  }
};

// Save features to localStorage
const saveFeatures = (features: VenueFeature[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  } catch {
    console.error('Failed to save features to localStorage');
  }
};

// Get all features for a venue
export const getFeaturesByVenue = async (venueId: string): Promise<VenueFeature[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  const allFeatures = loadFeatures();
  return allFeatures.filter(f => f.venueId === venueId);
};

// Get a single feature by ID
export const getFeatureById = async (featureId: string): Promise<VenueFeature | null> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  const allFeatures = loadFeatures();
  return allFeatures.find(f => f.id === featureId) || null;
};

// Create a new feature
export const createFeature = async (
  venueId: string,
  type: FeatureType,
  geometry: FeatureGeometry,
  style: FeatureStyle,
  name?: string,
  groupId?: string | null
): Promise<VenueFeature> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allFeatures = loadFeatures();
  const venueFeatures = allFeatures.filter(f => f.venueId === venueId);
  const maxZOrder = venueFeatures.reduce((max, f) => Math.max(max, f.zOrder), 0);
  
  const now = new Date().toISOString();
  const defaultName = `New ${type.charAt(0).toUpperCase() + type.slice(1)} ${venueFeatures.filter(f => f.type === type).length + 1}`;
  
  const feature: VenueFeature = {
    id: generateId(),
    venueId,
    type,
    name: name || defaultName,
    description: '',
    geometry,
    style,
    visibleToFans: true,
    visibleToMedia: true,
    visibleToOps: true,
    status: 'draft',
    zOrder: maxZOrder + 1,
    groupId: groupId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  
  allFeatures.push(feature);
  saveFeatures(allFeatures);
  
  return feature;
};

// Update an existing feature
export const updateFeature = async (
  featureId: string,
  updates: Partial<Omit<VenueFeature, 'id' | 'venueId' | 'createdAt'>>
): Promise<VenueFeature | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allFeatures = loadFeatures();
  const index = allFeatures.findIndex(f => f.id === featureId);
  
  if (index === -1) return null;
  
  const updatedFeature: VenueFeature = {
    ...allFeatures[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  allFeatures[index] = updatedFeature;
  saveFeatures(allFeatures);
  
  return updatedFeature;
};

// Delete a feature
export const deleteFeature = async (featureId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allFeatures = loadFeatures();
  const index = allFeatures.findIndex(f => f.id === featureId);
  
  if (index === -1) return false;
  
  allFeatures.splice(index, 1);
  saveFeatures(allFeatures);
  
  return true;
};

// Reorder feature z-index
export const reorderFeature = async (
  featureId: string,
  newZOrder: number
): Promise<VenueFeature | null> => {
  return updateFeature(featureId, { zOrder: newZOrder });
};

// Seed mock data for testing (only if no features exist)
export const seedMockFeatures = async (venueId: string): Promise<void> => {
  const existing = await getFeaturesByVenue(venueId);
  if (existing.length > 0) return;
  
  // Create sample features - coordinates based on typical venue
  // These will be relative to the actual venue when rendered
  const mockFeatures: Omit<VenueFeature, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      venueId,
      type: 'point',
      name: 'Start/Finish Line',
      description: 'Main start/finish line marker',
      geometry: {
        type: 'Point',
        coordinates: [-111.8825, 40.5855],
      },
      style: {
        color: '#22C55E',
        opacity: 1,
        strokeWidth: 2,
        fillColor: '#22C55E',
        fillOpacity: 0.3,
        icon: 'flag',
        iconSize: 1.5,
      },
      visibleToFans: true,
      visibleToMedia: true,
      visibleToOps: true,
      status: 'published',
      zOrder: 1,
    },
  ];
  
  for (const mock of mockFeatures) {
    const allFeatures = loadFeatures();
    const now = new Date().toISOString();
    allFeatures.push({
      ...mock,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    } as VenueFeature);
    saveFeatures(allFeatures);
  }
};
