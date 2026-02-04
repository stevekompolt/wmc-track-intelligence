// Context for managing multiple map overlays with visibility and CRUD operations

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { MapOverlay, BoundingBox, OverlayStatus, SnapSource } from '@/types/overlay';
import { calculateSnapBounds, getImageAspectRatio } from '@/types/overlay';
import type { AppMode } from '@/types/viewpoint';
import { useTrackContext } from '@/contexts/TrackContext';
import { useCurrentMode } from '@/hooks/useCurrentMode';
import * as overlaysApi from '@/services/overlaysApi';

interface OverlayContextType {
  // All overlays for the current track
  overlays: MapOverlay[];
  
  // Overlays filtered by current mode's visibility
  visibleOverlays: MapOverlay[];
  
  // Current mode
  currentMode: AppMode;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Selected overlay (for editor)
  selectedOverlay: MapOverlay | null;
  selectOverlay: (overlayId: string | null) => void;
  
  // Local visibility toggles (like hiddenFeatureIds)
  hiddenOverlayIds: Set<string>;
  toggleOverlayVisibility: (overlayId: string) => void;
  
  // CRUD operations
  createOverlay: (name?: string) => Promise<MapOverlay | null>;
  updateOverlay: (overlayId: string, updates: Partial<MapOverlay>) => Promise<void>;
  deleteOverlay: (overlayId: string) => Promise<void>;
  
  // Convenience updates
  updateName: (overlayId: string, name: string) => Promise<void>;
  updateDescription: (overlayId: string, description: string) => Promise<void>;
  updateBoundingBox: (overlayId: string, box: Partial<BoundingBox>) => Promise<void>;
  updateImageUrl: (overlayId: string, imageUrl: string) => Promise<void>;
  updateOpacity: (overlayId: string, opacity: number) => Promise<void>;
  updateVisibility: (overlayId: string, visibility: { fans?: boolean; media?: boolean; ops?: boolean }) => Promise<void>;
  updateStatus: (overlayId: string, status: OverlayStatus) => Promise<void>;
  toggleLock: (overlayId: string) => Promise<void>;
  
  // Refresh
  refreshOverlays: () => Promise<void>;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

// Filter overlays based on current mode's visibility flags
function filterByMode(overlays: MapOverlay[], mode: AppMode): MapOverlay[] {
  switch (mode) {
    case 'editor':
      // Editor sees all overlays
      return overlays;
    case 'fan':
      return overlays.filter(o => o.visibleToFans);
    case 'media':
      return overlays.filter(o => o.visibleToMedia);
    case 'ops':
      return overlays.filter(o => o.visibleToOps);
    default:
      return overlays;
  }
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const { selectedTrack } = useTrackContext();
  const currentMode = useCurrentMode();
  
  const [overlays, setOverlays] = useState<MapOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [hiddenOverlayIds, setHiddenOverlayIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected overlay from list
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId) || null;
  
  // Get visible overlays for current mode
  const visibleOverlays = filterByMode(overlays, currentMode);

  // Load overlays when track changes
  const loadOverlays = useCallback(async () => {
    if (!selectedTrack?.id) {
      setOverlays([]);
      setSelectedOverlayId(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const venueOverlays = await overlaysApi.getOverlaysByVenue(selectedTrack.id);
      setOverlays(venueOverlays.sort((a, b) => a.zOrder - b.zOrder));
    } catch (err) {
      setError('Failed to load overlays');
      console.error('Error loading overlays:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTrack?.id]);

  useEffect(() => {
    loadOverlays();
  }, [loadOverlays]);

  // Select an overlay
  const selectOverlay = useCallback((overlayId: string | null) => {
    setSelectedOverlayId(overlayId);
  }, []);

  // Toggle local visibility
  const toggleOverlayVisibility = useCallback((overlayId: string) => {
    setHiddenOverlayIds(prev => {
      const next = new Set(prev);
      if (next.has(overlayId)) {
        next.delete(overlayId);
      } else {
        next.add(overlayId);
      }
      return next;
    });
  }, []);

  // Create a new overlay with auto-snap to venue bounds
  const createOverlay = useCallback(async (name?: string): Promise<MapOverlay | null> => {
    if (!selectedTrack?.id) return null;

    try {
      const overlay = await overlaysApi.createOverlay(selectedTrack.id, name);
      
      // Auto-position at venue center
      const venueCoords = { lat: selectedTrack.latitude, lng: selectedTrack.longitude };
      const bounds = calculateSnapBounds(venueCoords, 1, 0.015);
      const updatedOverlay = await overlaysApi.updateOverlay(overlay.id, { boundingBox: bounds });
      
      const finalOverlay = updatedOverlay || overlay;
      setOverlays(prev => [...prev, finalOverlay].sort((a, b) => a.zOrder - b.zOrder));
      setSelectedOverlayId(finalOverlay.id);
      return finalOverlay;
    } catch (err) {
      setError('Failed to create overlay');
      console.error('Error creating overlay:', err);
      return null;
    }
  }, [selectedTrack?.id, selectedTrack?.latitude, selectedTrack?.longitude]);

  // Update an overlay
  const updateOverlay = useCallback(async (
    overlayId: string,
    updates: Partial<MapOverlay>
  ): Promise<void> => {
    try {
      const updated = await overlaysApi.updateOverlay(overlayId, updates);
      if (updated) {
        setOverlays(prev => 
          prev.map(o => o.id === overlayId ? updated : o).sort((a, b) => a.zOrder - b.zOrder)
        );
      }
    } catch (err) {
      setError('Failed to update overlay');
      console.error('Error updating overlay:', err);
    }
  }, []);

  // Delete an overlay
  const deleteOverlay = useCallback(async (overlayId: string): Promise<void> => {
    try {
      const success = await overlaysApi.deleteOverlay(overlayId);
      if (success) {
        setOverlays(prev => prev.filter(o => o.id !== overlayId));
        if (selectedOverlayId === overlayId) {
          setSelectedOverlayId(null);
        }
        // Also remove from hidden set
        setHiddenOverlayIds(prev => {
          const next = new Set(prev);
          next.delete(overlayId);
          return next;
        });
      }
    } catch (err) {
      setError('Failed to delete overlay');
      console.error('Error deleting overlay:', err);
    }
  }, [selectedOverlayId]);

  // Convenience update methods
  const updateName = useCallback(async (overlayId: string, name: string) => {
    await updateOverlay(overlayId, { name });
  }, [updateOverlay]);

  const updateDescription = useCallback(async (overlayId: string, description: string) => {
    await updateOverlay(overlayId, { description });
  }, [updateOverlay]);

  const updateBoundingBox = useCallback(async (overlayId: string, boxUpdates: Partial<BoundingBox>) => {
    const overlay = overlays.find(o => o.id === overlayId);
    if (!overlay) return;
    await updateOverlay(overlayId, { boundingBox: { ...overlay.boundingBox, ...boxUpdates } });
  }, [overlays, updateOverlay]);

  // Update image URL with auto-snap to venue bounds based on aspect ratio
  const updateImageUrl = useCallback(async (overlayId: string, imageUrl: string) => {
    if (!selectedTrack || !imageUrl) {
      await updateOverlay(overlayId, { imageUrl });
      return;
    }

    try {
      // Get aspect ratio and auto-fit to venue bounds
      const aspectRatio = await getImageAspectRatio(imageUrl);
      const venueCoords = { lat: selectedTrack.latitude, lng: selectedTrack.longitude };
      const bounds = calculateSnapBounds(venueCoords, aspectRatio, 0.015);
      
      // Update both image URL and bounding box
      await updateOverlay(overlayId, { 
        imageUrl,
        boundingBox: bounds,
      });
    } catch (err) {
      // Fallback: just update the image URL
      console.error('Error calculating auto-snap bounds:', err);
      await updateOverlay(overlayId, { imageUrl });
    }
  }, [selectedTrack, updateOverlay]);

  const updateOpacity = useCallback(async (overlayId: string, opacity: number) => {
    await updateOverlay(overlayId, { opacity });
  }, [updateOverlay]);

  const updateVisibility = useCallback(async (
    overlayId: string,
    visibility: { fans?: boolean; media?: boolean; ops?: boolean }
  ) => {
    const updates: Partial<MapOverlay> = {};
    if (visibility.fans !== undefined) updates.visibleToFans = visibility.fans;
    if (visibility.media !== undefined) updates.visibleToMedia = visibility.media;
    if (visibility.ops !== undefined) updates.visibleToOps = visibility.ops;
    await updateOverlay(overlayId, updates);
  }, [updateOverlay]);

  const updateStatus = useCallback(async (overlayId: string, status: OverlayStatus) => {
    await updateOverlay(overlayId, { status });
  }, [updateOverlay]);

  const toggleLock = useCallback(async (overlayId: string) => {
    const overlay = overlays.find(o => o.id === overlayId);
    if (!overlay) return;
    await updateOverlay(overlayId, { isLocked: !overlay.isLocked });
  }, [overlays, updateOverlay]);

  const refreshOverlays = useCallback(async () => {
    await loadOverlays();
  }, [loadOverlays]);

  return (
    <OverlayContext.Provider
      value={{
        overlays,
        visibleOverlays,
        currentMode,
        isLoading,
        error,
        selectedOverlay,
        selectOverlay,
        hiddenOverlayIds,
        toggleOverlayVisibility,
        createOverlay,
        updateOverlay,
        deleteOverlay,
        updateName,
        updateDescription,
        updateBoundingBox,
        updateImageUrl,
        updateOpacity,
        updateVisibility,
        updateStatus,
        toggleLock,
        refreshOverlays,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlayContext() {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlayContext must be used within an OverlayProvider');
  }
  return context;
}
