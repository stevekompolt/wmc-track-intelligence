import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layers, MousePointer2, MapPin, Spline, Hexagon, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { OverlayEditorPanel } from '@/components/editor/OverlayEditorPanel';
import { useTrackContext } from '@/contexts/TrackContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useOverlayEditor } from '@/hooks/useOverlayEditor';
import { useMapOverlayRenderer } from '@/hooks/useMapOverlayRenderer';
import type { CornerHandle, VenueCoords } from '@/types/overlay';
import mapboxgl from 'mapbox-gl';

type EditorMode = 'features' | 'overlay';

export default function TrackEditor() {
  const { selectedTrack } = useTrackContext();
  const { mapRef } = useViewpointContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('features');
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Memoize venue coordinates to prevent unnecessary re-renders
  const venueCoords: VenueCoords | null = useMemo(() => {
    if (!selectedTrack) return null;
    return {
      lat: selectedTrack.latitude,
      lng: selectedTrack.longitude,
    };
  }, [selectedTrack?.latitude, selectedTrack?.longitude]);

  const overlayEditor = useOverlayEditor(selectedTrack?.id, venueCoords);

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

  // Corner drag handler
  const handleCornerDrag = useCallback((corner: CornerHandle, lat: number, lng: number) => {
    overlayEditor.handleCornerDrag(corner, lat, lng);
  }, [overlayEditor]);

  // Move drag handler
  const handleMoveDrag = useCallback((deltaLat: number, deltaLng: number) => {
    overlayEditor.handleMoveDrag(deltaLat, deltaLng);
  }, [overlayEditor]);

  // Center on venue handler
  const handleCenterOnVenue = useCallback(() => {
    if (!selectedTrack) return;
    overlayEditor.centerOnVenue(selectedTrack.latitude, selectedTrack.longitude);
  }, [selectedTrack, overlayEditor]);

  // Fit to venue bounds handler
  const handleFitToVenueBounds = useCallback(() => {
    if (!selectedTrack) return;
    // Calculate approximate bounds based on track location
    const span = 0.01; // ~1km
    overlayEditor.fitToVenueBounds({
      north: selectedTrack.latitude + span,
      south: selectedTrack.latitude - span,
      east: selectedTrack.longitude + span,
      west: selectedTrack.longitude - span,
    });
  }, [selectedTrack, overlayEditor]);

  // Initialize overlay renderer
  useMapOverlayRenderer({
    map: mapInstance,
    overlay: overlayEditor.overlay,
    dragMode: overlayEditor.dragMode,
    ghostBounds: overlayEditor.ghostBounds,
    onCornerDrag: handleCornerDrag,
    onMoveDrag: handleMoveDrag,
  });

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-[360px] z-10 flex items-center justify-between px-3 h-10 bg-secondary/95 backdrop-blur pointer-events-auto">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">SELECT MODE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">2D VIEW</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="absolute top-0 right-0 bottom-0 w-[360px] z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col pointer-events-auto">
        {/* Mode Tabs */}
        <div className="p-3 border-b border-border">
          <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as EditorMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="features" className="flex-1">
                <Layers className="h-4 w-4 mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="overlay" className="flex-1">
                <ImageIcon className="h-4 w-4 mr-2" />
                Overlay
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {editorMode === 'features' ? (
          <>
            {/* Feature Toolbox */}
            <div className="p-3 border-b border-border">
              <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                FEATURE TOOLBOX
              </h2>
            </div>
            <div className="p-3 border-b border-border">
              {selectedTrack ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* Add Point - placeholder */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2"
                        disabled
                      >
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs">Point</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Coming soon</TooltipContent>
                  </Tooltip>
                  
                  {/* Add Line - placeholder */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2"
                        disabled
                      >
                        <Spline className="h-4 w-4" />
                        <span className="text-xs">Line</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Coming soon</TooltipContent>
                  </Tooltip>
                  
                  {/* Add Polygon - placeholder */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2"
                        disabled
                      >
                        <Hexagon className="h-4 w-4" />
                        <span className="text-xs">Polygon</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Coming soon</TooltipContent>
                  </Tooltip>
                  
                  {/* Save Viewpoint - functional */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2 hover:border-primary hover:text-primary"
                        onClick={() => setSaveDialogOpen(true)}
                      >
                        <Camera className="h-4 w-4" />
                        <span className="text-xs">Viewpoint</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Save current camera position</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">
                  Select a track to begin editing
                </p>
              )}
            </div>
            
            {/* Feature Inspector */}
            <div className="p-3 border-b border-border">
              <h2 className="font-display text-sm font-semibold tracking-wider">
                FEATURE INSPECTOR
              </h2>
            </div>
            <div className="flex-1 p-3 overflow-auto">
              <p className="text-xs text-muted-foreground font-mono">
                {selectedTrack
                  ? 'Select a feature to view properties'
                  : 'Select a track first'}
              </p>
            </div>
          </>
        ) : (
          <OverlayEditorPanel
            overlay={overlayEditor.overlay}
            isDirty={overlayEditor.isDirty}
            isEditing={overlayEditor.isEditing}
            dragMode={overlayEditor.dragMode}
            canUndo={overlayEditor.canUndo}
            canSave={overlayEditor.canSave}
            lastSaved={overlayEditor.lastSaved}
            isPreviewingSnap={overlayEditor.isPreviewingSnap}
            onUpdateOverlay={overlayEditor.updateOverlay}
            onUpdateBoundingBox={overlayEditor.updateBoundingBox}
            onSetImageUrl={overlayEditor.setImageUrl}
            onSetEditing={overlayEditor.setEditing}
            onSetDragMode={overlayEditor.setDragMode}
            onCenterOnVenue={handleCenterOnVenue}
            onFitToVenueBounds={handleFitToVenueBounds}
            onResetPlacement={overlayEditor.resetPlacement}
            onToggleLock={overlayEditor.toggleLock}
            onSetStatus={overlayEditor.setStatus}
            onUndo={overlayEditor.undo}
            onCreateOverlay={overlayEditor.createOverlay}
            onSetSnapSource={overlayEditor.setSnapSource}
            onSetAutoFitOnLoad={overlayEditor.setAutoFitOnLoad}
            onSnapNow={overlayEditor.commitSnap}
            onReSnap={overlayEditor.reSnap}
            onResetToFree={overlayEditor.resetToFree}
          />
        )}
      </div>
      
      {/* Save Viewpoint Dialog */}
      <SaveViewpointDialog 
        open={saveDialogOpen} 
        onOpenChange={setSaveDialogOpen} 
      />
    </div>
  );
}
