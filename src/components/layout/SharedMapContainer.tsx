import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { TrackMap, TrackMapHandle } from '@/components/editor/TrackMap';
import { ViewpointSelector } from '@/components/viewpoints/ViewpointSelector';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { useTrackContext } from '@/contexts/TrackContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { useOverlayContext } from '@/contexts/OverlayContext';
import { useSharedFeatureRenderer } from '@/hooks/useSharedFeatureRenderer';
import mapboxgl from 'mapbox-gl';

export function SharedMapContainer() {
  const { selectedTrack } = useTrackContext();
  const { mapRef } = useViewpointContext();
  const { visibleFeatures, currentMode } = useFeatureContext();
  const { visibleOverlays } = useOverlayContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Get map instance when available
  useEffect(() => {
    const checkMapInstance = () => {
      const instance = mapRef.current?.getMapInstance?.() as mapboxgl.Map | null;
      if (instance) {
        setMapInstance(instance);
      }
    };
    
    // Check immediately and after a delay
    checkMapInstance();
    const timeout = setTimeout(checkMapInstance, 1000);
    return () => clearTimeout(timeout);
  }, [mapRef, selectedTrack]);

  // Render features and overlays with mode-aware visibility
  useSharedFeatureRenderer({
    map: mapInstance,
    features: visibleFeatures,
    overlays: visibleOverlays,
    currentMode,
  });

  if (!selectedTrack) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <Card className="border-dashed">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Map className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-display text-lg">Map Canvas</p>
              <p className="text-sm text-muted-foreground">
                Select a track from the nav bar to load the map
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <TrackMap
        ref={mapRef as React.RefObject<TrackMapHandle>}
        trackName={selectedTrack.name}
        latitude={selectedTrack.latitude}
        longitude={selectedTrack.longitude}
        zoom={selectedTrack.zoom}
      />
      
      {/* Viewpoint selector - bottom left */}
      <ViewpointSelector onAddClick={() => setSaveDialogOpen(true)} />
      
      {/* Save viewpoint dialog */}
      <SaveViewpointDialog 
        open={saveDialogOpen} 
        onOpenChange={setSaveDialogOpen} 
      />
    </div>
  );
}
