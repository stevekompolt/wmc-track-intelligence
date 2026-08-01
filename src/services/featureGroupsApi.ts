// Mock API for feature groups (map layers) with localStorage persistence

import type { FeatureGroup } from '@/types/feature';

const STORAGE_KEY = 'venue-feature-groups';

const generateId = (): string =>
  `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const loadGroups = (): FeatureGroup[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('Failed to load feature groups from localStorage');
    return [];
  }
};

const saveGroups = (groups: FeatureGroup[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    console.error('Failed to save feature groups to localStorage');
  }
};

export const getGroupsByVenue = async (venueId: string): Promise<FeatureGroup[]> => {
  return loadGroups().filter((g) => g.venueId === venueId);
};

export const createGroup = async (
  venueId: string,
  name?: string,
): Promise<FeatureGroup> => {
  const all = loadGroups();
  const venueGroups = all.filter((g) => g.venueId === venueId);
  const maxZOrder = venueGroups.reduce((max, g) => Math.max(max, g.zOrder), 0);
  const now = new Date().toISOString();

  const group: FeatureGroup = {
    id: generateId(),
    venueId,
    name: name || `Layer ${venueGroups.length + 1}`,
    zOrder: maxZOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  all.push(group);
  saveGroups(all);
  return group;
};

export const updateGroup = async (
  groupId: string,
  updates: Partial<Omit<FeatureGroup, 'id' | 'venueId' | 'createdAt'>>,
): Promise<FeatureGroup | null> => {
  const all = loadGroups();
  const index = all.findIndex((g) => g.id === groupId);
  if (index === -1) return null;

  const updated: FeatureGroup = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  saveGroups(all);
  return updated;
};

export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const all = loadGroups();
  const next = all.filter((g) => g.id !== groupId);
  if (next.length === all.length) return false;
  saveGroups(next);
  return true;
};