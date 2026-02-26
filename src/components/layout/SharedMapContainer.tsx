import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { TrackMap, TrackMapHandle } from '@/components/editor/TrackMap';
import { CesiumMap, CesiumMapHandle } from '@/components/editor/CesiumMap';
import { ViewpointSelector } from '@/components/viewpoints/ViewpointSelector';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { EngineToggle } from '@/components/layout/EngineToggle';
import { useTrackContext } from '@/contexts/TrackContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { useOverlayContext } from '@/contexts/OverlayContext';
import { useSharedFeatureRenderer } from '@/hooks/useSharedFeatureRenderer';
import { useCesiumFeatureRenderer } from '@/hooks/useCesiumFeatureRenderer';
import type { CameraState } from '@/types/viewpoint';
import type { Viewer } from 'cesium';
import mapboxgl from 'mapbox-gl';

export function SharedMapContainer() {
  const { selectedTrack } = useTrackContext();
  const { mapRef, engine, setEngine } = useViewpointContext();
  type MapEngine = typeof engine;
  const { visibleFeatures, currentMode } = useFeatureContext();
  const { visibleOverlays } = useOverlayContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [cesiumViewer, setCesiumViewer] = useState<Viewer | null>(null);

  // Camera state to preserve when switching engines
  const savedCameraRef = useRef<CameraState | null>(null);
  const cesiumRef = useRef<CesiumMapHandle>(null);

  // Synchronous capture-then-switch to avoid race condition
  const handleEngineSwitch = useCallback((newEngine: MapEngine) => {
    // Capture from the CURRENT engine before unmounting it
    if (engine === 'mapbox') {
      const cam = mapRef.current?.captureCamera?.();
      if (cam) savedCameraRef.current = cam;
    } else {
      const cam = cesiumRef.current?.captureCamera?.();
      if (cam) savedCameraRef.current = cam;
    }
    setEngine(newEngine);
  }, [engine, mapRef, setEngine]);

  // Get Mapbox instance
  useEffect(() => {
    if (engine !== 'mapbox') { setMapInstance(null); return; }
    const check = () => {
      const instance = mapRef.current?.getMapInstance?.() as mapboxgl.Map | null;
      if (instance) setMapInstance(instance);
    };
    check();
    const t = setTimeout(check, 1000);
    return () => clearTimeout(t);
  }, [mapRef, selectedTrack, engine]);

  // Get Cesium viewer instance
  useEffect(() => {
    if (engine !== 'cesium') { setCesiumViewer(null); return; }
    const check = () => {
      const v = cesiumRef.current?.getViewer?.() as Viewer | null;
      if (v) setCesiumViewer(v);
    };
    check();
    const t = setTimeout(check, 1000);
    return () => clearTimeout(t);
  }, [engine, selectedTrack]);

  // Render features via Mapbox
  useSharedFeatureRenderer({
    map: engine === 'mapbox' ? mapInstance : null,
    features: visibleFeatures,
    overlays: visibleOverlays,
    currentMode,
  });

  // Render features via Cesium
  useCesiumFeatureRenderer({
    viewer: engine === 'cesium' ? cesiumViewer : null,
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
      {engine === 'mapbox' ? (
        <TrackMap
          ref={mapRef as React.RefObject<TrackMapHandle>}
          trackName={selectedTrack.name}
          latitude={selectedTrack.latitude}
          longitude={selectedTrack.longitude}
          zoom={selectedTrack.zoom}
          initialCameraState={savedCameraRef.current}
        />
      ) : (
        <CesiumMap
          ref={cesiumRef}
          trackName={selectedTrack.name}
          latitude={selectedTrack.latitude}
          longitude={selectedTrack.longitude}
          zoom={selectedTrack.zoom}
          initialCameraState={savedCameraRef.current}
        />
      )}

      {/* Engine toggle */}
      <EngineToggle onToggle={handleEngineSwitch} />
      
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
