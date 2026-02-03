import { useCallback, useState } from 'react';
import type { BoundingBox, SnapSource, VenueCoords } from '@/types/overlay';
import { calculateSnapBounds, getImageAspectRatio } from '@/types/overlay';

interface UseOverlaySnappingOptions {
  venueCoords: VenueCoords | null;
  currentImageUrl: string;
}

interface SnapResult {
  bounds: BoundingBox;
  source: SnapSource;
}

export function useOverlaySnapping({
  venueCoords,
  currentImageUrl,
}: UseOverlaySnappingOptions) {
  const [ghostBounds, setGhostBounds] = useState<BoundingBox | null>(null);
  const [isPreviewingSnap, setIsPreviewingSnap] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  // Load aspect ratio when image changes
  const loadAspectRatio = useCallback(async (imageUrl: string) => {
    if (!imageUrl) {
      setAspectRatio(1);
      return 1;
    }
    const ratio = await getImageAspectRatio(imageUrl);
    setAspectRatio(ratio);
    return ratio;
  }, []);

  // Calculate snap bounds based on source
  const calculateSnap = useCallback(async (
    source: SnapSource,
    imageUrl?: string
  ): Promise<SnapResult | null> => {
    if (!venueCoords) return null;

    // Get current or provided aspect ratio
    const ratio = imageUrl 
      ? await getImageAspectRatio(imageUrl)
      : aspectRatio;

    switch (source) {
      case 'venue_bounds': {
        // Use venue center with appropriate span for motorsports venues
        const bounds = calculateSnapBounds(venueCoords, ratio, 0.015);
        return { bounds, source };
      }

      case 'none':
      default:
        return null;
    }
  }, [venueCoords, aspectRatio]);

  // Preview snap (show ghost overlay)
  const previewSnap = useCallback(async (source: SnapSource) => {
    if (source === 'none') {
      setGhostBounds(null);
      setIsPreviewingSnap(false);
      return;
    }

    const result = await calculateSnap(source);
    if (result) {
      setGhostBounds(result.bounds);
      setIsPreviewingSnap(true);
    }
  }, [calculateSnap]);

  // Commit snap (apply ghost bounds to actual overlay)
  const commitSnap = useCallback((): BoundingBox | null => {
    const bounds = ghostBounds;
    setGhostBounds(null);
    setIsPreviewingSnap(false);
    return bounds;
  }, [ghostBounds]);

  // Clear snap preview
  const clearPreview = useCallback(() => {
    setGhostBounds(null);
    setIsPreviewingSnap(false);
  }, []);

  // Auto-fit bounds when image is uploaded
  const autoFitOnImageUpload = useCallback(async (
    imageUrl: string
  ): Promise<BoundingBox | null> => {
    if (!venueCoords || !imageUrl) return null;

    const ratio = await loadAspectRatio(imageUrl);
    const bounds = calculateSnapBounds(venueCoords, ratio, 0.015);
    return bounds;
  }, [venueCoords, loadAspectRatio]);

  // Re-snap with current settings
  const reSnap = useCallback(async (
    source: SnapSource
  ): Promise<BoundingBox | null> => {
    if (source === 'none' || !venueCoords) return null;

    const result = await calculateSnap(source, currentImageUrl);
    return result?.bounds || null;
  }, [calculateSnap, currentImageUrl, venueCoords]);

  return {
    // State
    ghostBounds,
    isPreviewingSnap,
    aspectRatio,

    // Actions
    loadAspectRatio,
    calculateSnap,
    previewSnap,
    commitSnap,
    clearPreview,
    autoFitOnImageUpload,
    reSnap,
  };
}
