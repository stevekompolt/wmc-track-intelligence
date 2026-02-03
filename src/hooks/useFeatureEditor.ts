// Hook for managing venue features - CRUD operations and state

import { useState, useCallback, useEffect } from 'react';
import type { VenueFeature, FeatureType, FeatureGeometry, FeatureStyle, FeatureStatus } from '@/types/feature';
import { DEFAULT_FEATURE_STYLE } from '@/types/feature';
import * as featuresApi from '@/services/featuresApi';

interface UseFeatureEditorOptions {
  venueId: string | undefined;
  onFeatureCreated?: (feature: VenueFeature) => void;
}

interface UseFeatureEditorResult {
  features: VenueFeature[];
  selectedFeature: VenueFeature | null;
  isLoading: boolean;
  error: string | null;
  
  // Selection
  selectFeature: (featureId: string | null) => void;
  
  // CRUD operations
  createFeature: (type: FeatureType, geometry: FeatureGeometry, style?: FeatureStyle) => Promise<VenueFeature | null>;
  updateFeature: (featureId: string, updates: Partial<VenueFeature>) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;
  
  // Convenience updates
  updateName: (featureId: string, name: string) => Promise<void>;
  updateDescription: (featureId: string, description: string) => Promise<void>;
  updateStyle: (featureId: string, style: Partial<FeatureStyle>) => Promise<void>;
  updateVisibility: (featureId: string, visibility: { fans?: boolean; media?: boolean; ops?: boolean }) => Promise<void>;
  updateStatus: (featureId: string, status: FeatureStatus) => Promise<void>;
  
  // Refresh
  refreshFeatures: () => Promise<void>;
}

export function useFeatureEditor({ venueId, onFeatureCreated }: UseFeatureEditorOptions): UseFeatureEditorResult {
  const [features, setFeatures] = useState<VenueFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected feature from list
  const selectedFeature = features.find(f => f.id === selectedFeatureId) || null;

  // Load features when venue changes
  const loadFeatures = useCallback(async () => {
    if (!venueId) {
      setFeatures([]);
      setSelectedFeatureId(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const venueFeatures = await featuresApi.getFeaturesByVenue(venueId);
      setFeatures(venueFeatures.sort((a, b) => a.zOrder - b.zOrder));
    } catch (err) {
      setError('Failed to load features');
      console.error('Error loading features:', err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

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
    if (!venueId) return null;

    try {
      const feature = await featuresApi.createFeature(venueId, type, geometry, style);
      setFeatures(prev => [...prev, feature].sort((a, b) => a.zOrder - b.zOrder));
      setSelectedFeatureId(feature.id);
      onFeatureCreated?.(feature);
      return feature;
    } catch (err) {
      setError('Failed to create feature');
      console.error('Error creating feature:', err);
      return null;
    }
  }, [venueId, onFeatureCreated]);

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

  const refreshFeatures = useCallback(async () => {
    await loadFeatures();
  }, [loadFeatures]);

  return {
    features,
    selectedFeature,
    isLoading,
    error,
    selectFeature,
    createFeature,
    updateFeature,
    deleteFeature,
    updateName,
    updateDescription,
    updateStyle,
    updateVisibility,
    updateStatus,
    refreshFeatures,
  };
}
