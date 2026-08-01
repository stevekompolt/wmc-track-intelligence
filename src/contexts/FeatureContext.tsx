// Context for sharing feature state across all views with mode-aware filtering

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { VenueFeature, FeatureType, FeatureGeometry, FeatureStyle, FeatureStatus, FeatureGroup } from '@/types/feature';
import type { AppMode } from '@/types/viewpoint';
import { DEFAULT_FEATURE_STYLE } from '@/types/feature';
import { useTrackContext } from '@/contexts/TrackContext';
import { useCurrentMode } from '@/hooks/useCurrentMode';
import * as featuresApi from '@/services/featuresApi';
import * as groupsApi from '@/services/featureGroupsApi';
import { getPolygonParts, buildPolygonGeometry } from '@/lib/polygonParts';

interface FeatureContextType {
  // All features for the current track
  features: VenueFeature[];

  // Layers (groups) for the current track
  groups: FeatureGroup[];

  // Layer that new features are added to (null = root)
  activeGroupId: string | null;
  setActiveGroupId: (groupId: string | null) => void;
  
  // Features filtered by current mode's visibility
  visibleFeatures: VenueFeature[];
  
  // Current mode
  currentMode: AppMode;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Selected feature (for editor)
  selectedFeature: VenueFeature | null;
  selectFeature: (featureId: string | null) => void;
  
  // CRUD operations
  createFeature: (type: FeatureType, geometry: FeatureGeometry, style?: FeatureStyle) => Promise<VenueFeature | null>;
  updateFeature: (featureId: string, updates: Partial<VenueFeature>) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;

  // Group operations
  createGroup: (name?: string) => Promise<FeatureGroup | null>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  moveFeatureToGroup: (featureId: string, groupId: string | null) => Promise<void>;
  
  // Convenience updates
  updateName: (featureId: string, name: string) => Promise<void>;
  updateDescription: (featureId: string, description: string) => Promise<void>;
  updateStyle: (featureId: string, style: Partial<FeatureStyle>) => Promise<void>;
  updateVisibility: (featureId: string, visibility: { fans?: boolean; media?: boolean; ops?: boolean }) => Promise<void>;
  updateStatus: (featureId: string, status: FeatureStatus) => Promise<void>;
  updateGeometry: (featureId: string, geometry: FeatureGeometry) => Promise<void>;
  
  // Refresh
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

// Filter features based on current mode's visibility flags
function filterByMode(features: VenueFeature[], mode: AppMode): VenueFeature[] {
  switch (mode) {
    case 'editor':
      // Editor sees all features
      return features;
    case 'fan':
      return features.filter(f => f.visibleToFans);
    case 'media':
      return features.filter(f => f.visibleToMedia);
    case 'ops':
      return features.filter(f => f.visibleToOps);
    default:
      return features;
  }
}

export function FeatureProvider({ children }: { children: ReactNode }) {
  const { selectedTrack } = useTrackContext();
  const currentMode = useCurrentMode();
  
  const [features, setFeatures] = useState<VenueFeature[]>([]);
  const [groups, setGroups] = useState<FeatureGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected feature from list
  const selectedFeature = features.find(f => f.id === selectedFeatureId) || null;
  
  // Get visible features for current mode
  const visibleFeatures = filterByMode(features, currentMode);

  // Load features when track changes
  const loadFeatures = useCallback(async () => {
    if (!selectedTrack?.id) {
      setFeatures([]);
      setGroups([]);
      setActiveGroupId(null);
      setSelectedFeatureId(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const venueId = selectedTrack.id;
      let venueFeatures = await featuresApi.getFeaturesByVenue(venueId);

      // Migrate legacy multi-part polygons: each shape becomes its own feature
      // inside a layer named after the original.
      const legacy = venueFeatures.filter(f => f.geometry.type === 'MultiPolygon');
      for (const feature of legacy) {
        const parts = getPolygonParts(feature.geometry);
        const group = await groupsApi.createGroup(venueId, feature.name);
        await featuresApi.updateFeature(feature.id, {
          groupId: group.id,
          name: `${feature.name} 1`,
          geometry: buildPolygonGeometry([parts[0] ?? []]),
        });
        for (let i = 1; i < parts.length; i++) {
          const child = await featuresApi.createFeature(
            venueId,
            'polygon',
            buildPolygonGeometry([parts[i]]),
            feature.style,
            `${feature.name} ${i + 1}`,
            group.id,
          );
          await featuresApi.updateFeature(child.id, {
            description: feature.description,
            visibleToFans: feature.visibleToFans,
            visibleToMedia: feature.visibleToMedia,
            visibleToOps: feature.visibleToOps,
            status: feature.status,
          });
        }
      }
      if (legacy.length > 0) {
        venueFeatures = await featuresApi.getFeaturesByVenue(venueId);
      }

      const venueGroups = await groupsApi.getGroupsByVenue(venueId);
      setGroups(venueGroups.sort((a, b) => a.zOrder - b.zOrder));
      setFeatures(venueFeatures.sort((a, b) => a.zOrder - b.zOrder));
    } catch (err) {
      setError('Failed to load features');
      console.error('Error loading features:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTrack?.id]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Select a feature
  const selectFeature = useCallback((featureId: string | null) => {
    setSelectedFeatureId(featureId);
  }, []);

  // Create a new feature
  const createFeature = useCallback(async (
    type: FeatureType,
    geometry: FeatureGeometry,
    style: FeatureStyle = DEFAULT_FEATURE_STYLE
  ): Promise<VenueFeature | null> => {
    if (!selectedTrack?.id) return null;

    try {
      const feature = await featuresApi.createFeature(
        selectedTrack.id,
        type,
        geometry,
        style,
        undefined,
        activeGroupId,
      );
      setFeatures(prev => [...prev, feature].sort((a, b) => a.zOrder - b.zOrder));
      setSelectedFeatureId(feature.id);
      return feature;
    } catch (err) {
      setError('Failed to create feature');
      console.error('Error creating feature:', err);
      return null;
    }
  }, [selectedTrack?.id, activeGroupId]);

  // Update a feature
  const updateFeature = useCallback(async (
    featureId: string,
    updates: Partial<VenueFeature>
  ): Promise<void> => {
    try {
      const updated = await featuresApi.updateFeature(featureId, updates);
      if (updated) {
        setFeatures(prev => 
          prev.map(f => f.id === featureId ? updated : f).sort((a, b) => a.zOrder - b.zOrder)
        );
      }
    } catch (err) {
      setError('Failed to update feature');
      console.error('Error updating feature:', err);
    }
  }, []);

  // Delete a feature
  const deleteFeature = useCallback(async (featureId: string): Promise<void> => {
    try {
      const success = await featuresApi.deleteFeature(featureId);
      if (success) {
        setFeatures(prev => prev.filter(f => f.id !== featureId));
        if (selectedFeatureId === featureId) {
          setSelectedFeatureId(null);
        }
      }
    } catch (err) {
      setError('Failed to delete feature');
      console.error('Error deleting feature:', err);
    }
  }, [selectedFeatureId]);

  // Convenience update methods
  const updateName = useCallback(async (featureId: string, name: string) => {
    await updateFeature(featureId, { name });
  }, [updateFeature]);

  const updateDescription = useCallback(async (featureId: string, description: string) => {
    await updateFeature(featureId, { description });
  }, [updateFeature]);

  const updateStyle = useCallback(async (featureId: string, styleUpdates: Partial<FeatureStyle>) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;
    await updateFeature(featureId, { style: { ...feature.style, ...styleUpdates } });
  }, [features, updateFeature]);

  const updateVisibility = useCallback(async (
    featureId: string,
    visibility: { fans?: boolean; media?: boolean; ops?: boolean }
  ) => {
    const updates: Partial<VenueFeature> = {};
    if (visibility.fans !== undefined) updates.visibleToFans = visibility.fans;
    if (visibility.media !== undefined) updates.visibleToMedia = visibility.media;
    if (visibility.ops !== undefined) updates.visibleToOps = visibility.ops;
    await updateFeature(featureId, updates);
  }, [updateFeature]);

  const updateStatus = useCallback(async (featureId: string, status: FeatureStatus) => {
    await updateFeature(featureId, { status });
  }, [updateFeature]);

  const updateGeometry = useCallback(async (featureId: string, geometry: FeatureGeometry) => {
    await updateFeature(featureId, { geometry });
  }, [updateFeature]);

  const refreshFeatures = useCallback(async () => {
    await loadFeatures();
  }, [loadFeatures]);

  // ---- Group operations ----
  const createGroup = useCallback(async (name?: string): Promise<FeatureGroup | null> => {
    if (!selectedTrack?.id) return null;
    try {
      const group = await groupsApi.createGroup(selectedTrack.id, name);
      setGroups(prev => [...prev, group].sort((a, b) => a.zOrder - b.zOrder));
      setActiveGroupId(group.id);
      return group;
    } catch (err) {
      setError('Failed to create layer');
      console.error('Error creating layer:', err);
      return null;
    }
  }, [selectedTrack?.id]);

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    const updated = await groupsApi.updateGroup(groupId, { name });
    if (updated) {
      setGroups(prev => prev.map(g => (g.id === groupId ? updated : g)));
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    const children = features.filter(f => f.groupId === groupId);
    for (const child of children) {
      await featuresApi.deleteFeature(child.id);
    }
    await groupsApi.deleteGroup(groupId);
    setFeatures(prev => prev.filter(f => f.groupId !== groupId));
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setActiveGroupId(prev => (prev === groupId ? null : prev));
    if (children.some(c => c.id === selectedFeatureId)) {
      setSelectedFeatureId(null);
    }
  }, [features, selectedFeatureId]);

  const moveFeatureToGroup = useCallback(async (featureId: string, groupId: string | null) => {
    await updateFeature(featureId, { groupId });
  }, [updateFeature]);

  return (
    <FeatureContext.Provider
      value={{
        features,
        groups,
        activeGroupId,
        setActiveGroupId,
        visibleFeatures,
        currentMode,
        isLoading,
        error,
        selectedFeature,
        selectFeature,
        createFeature,
        updateFeature,
        deleteFeature,
        createGroup,
        renameGroup,
        deleteGroup,
        moveFeatureToGroup,
        updateName,
        updateDescription,
        updateStyle,
        updateVisibility,
        updateStatus,
        updateGeometry,
        refreshFeatures,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatureContext() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatureContext must be used within a FeatureProvider');
  }
  return context;
}
