import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layers, MousePointer2, MapPin, Spline, Hexagon, Camera, Image as ImageIcon, ChevronDown, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { OverlayEditorPanel } from '@/components/editor/OverlayEditorPanel';
import { FeatureInspector } from '@/components/editor/FeatureInspector';
import { CollapsibleFeatureList } from '@/components/editor/CollapsibleFeatureList';
import { DetectTrackDialog } from '@/components/editor/DetectTrackDialog';
import { useTrackContext } from '@/contexts/TrackContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { useOverlayEditor } from '@/hooks/useOverlayEditor';
import { useMapOverlayRenderer } from '@/hooks/useMapOverlayRenderer';
import { useFeatureDrawing } from '@/hooks/useFeatureDrawing';
import { useFeatureRenderer } from '@/hooks/useFeatureRenderer';
import { useFeatureGeometryEditor } from '@/hooks/useFeatureGeometryEditor';
import { useAsphaltDetection } from '@/hooks/useAsphaltDetection';
import type { CornerHandle, VenueCoords } from '@/types/overlay';
import type { FeatureType, FeatureGeometry, PolygonGeometry } from '@/types/feature';
import { DEFAULT_FEATURE_STYLE } from '@/types/feature';
import mapboxgl from 'mapbox-gl';

type EditorMode = 'features' | 'overlay';

// Drawing mode toolbar instructions
const DRAWING_INSTRUCTIONS: Record<string, { icon: React.ReactNode; label: string; hint: string }> = {
  point: {
    icon: <MapPin className="h-4 w-4" />,
    label: 'DRAWING POINT',
    hint: 'Click to place • ESC to cancel',
  },
  line: {
    icon: <Spline className="h-4 w-4" />,
    label: 'DRAWING LINE',
    hint: 'Click to add points • Double-click to finish • ESC to cancel',
  },
  polygon: {
    icon: <Hexagon className="h-4 w-4" />,
    label: 'DRAWING POLYGON',
    hint: 'Click to add points • Close shape to finish • ESC to cancel',
  },
};

export default function TrackEditor() {
  const { selectedTrack } = useTrackContext();
  const { mapRef } = useViewpointContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('features');
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [editingGeometryFeatureId, setEditingGeometryFeatureId] = useState<string | null>(null);
  const [hiddenFeatureIds, setHiddenFeatureIds] = useState<Set<string>>(new Set());

  // Toggle feature visibility on map
  const handleToggleVisibility = useCallback((featureId: string) => {
    setHiddenFeatureIds(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  }, []);

  // Memoize venue coordinates to prevent unnecessary re-renders
  const venueCoords: VenueCoords | null = useMemo(() => {
    if (!selectedTrack) return null;
    return {
      lat: selectedTrack.latitude,
      lng: selectedTrack.longitude,
    };
  }, [selectedTrack?.latitude, selectedTrack?.longitude]);

  const overlayEditor = useOverlayEditor(selectedTrack?.id, venueCoords);

  // Feature context - shared across all views
  const featureContext = useFeatureContext();

  // Handle feature complete from drawing
  const handleFeatureComplete = useCallback((type: FeatureType, geometry: FeatureGeometry) => {
    featureContext.createFeature(type, geometry, DEFAULT_FEATURE_STYLE);
  }, [featureContext]);

  // Handle detected polygon from asphalt detection
  const handleDetectionComplete = useCallback(async (geometry: PolygonGeometry) => {
    const feature = await featureContext.createFeature('polygon', geometry, {
      ...DEFAULT_FEATURE_STYLE,
      color: '#333333',
      fillColor: '#333333',
      fillOpacity: 0.3,
    });
    // Update name and description after creation
    if (feature) {
      await featureContext.updateName(feature.id, 'Track Surface');
      await featureContext.updateDescription(feature.id, 'Auto-detected track surface');
    }
  }, [featureContext]);

  // Asphalt detection hook
  const asphaltDetection = useAsphaltDetection({
    map: mapInstance,
    onDetectionComplete: handleDetectionComplete,
  });

  // Feature drawing hook
  const featureDrawing = useFeatureDrawing({
    map: mapInstance,
    onFeatureComplete: handleFeatureComplete,
  });

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

  // Use refs for stable callback references - prevents marker recreation on every render
  const handleCornerDragRef = useRef(overlayEditor.handleCornerDrag);
  handleCornerDragRef.current = overlayEditor.handleCornerDrag;
  
  const handleMoveDragRef = useRef(overlayEditor.handleMoveDrag);
  handleMoveDragRef.current = overlayEditor.handleMoveDrag;

  // Stable corner drag handler
  const handleCornerDrag = useCallback((corner: CornerHandle, lat: number, lng: number) => {
    handleCornerDragRef.current(corner, lat, lng);
  }, []);

  // Stable move drag handler
  const handleMoveDrag = useCallback((deltaLat: number, deltaLng: number) => {
    handleMoveDragRef.current(deltaLat, deltaLng);
  }, []);

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

  // Initialize feature renderer (editor-specific with selection and editing support)
  useFeatureRenderer({
    map: mapInstance,
    features: featureContext.features,
    partialCoords: featureDrawing.partialCoords,
    drawingMode: featureDrawing.mode,
    selectedFeatureId: featureContext.selectedFeature?.id || null,
    editingGeometryFeatureId,
    hiddenFeatureIds,
    onFeatureClick: featureContext.selectFeature,
  });

  // Geometry editing for selected feature
  const editingFeature = editingGeometryFeatureId 
    ? featureContext.features.find(f => f.id === editingGeometryFeatureId) || null
    : null;

  useFeatureGeometryEditor({
    map: mapInstance,
    feature: editingFeature,
    isEditing: !!editingGeometryFeatureId,
    onGeometryUpdate: (geometry) => {
      if (editingGeometryFeatureId) {
        featureContext.updateGeometry(editingGeometryFeatureId, geometry);
      }
    },
  });

  // Handle drawing tool click
  const handleStartDrawing = useCallback((type: FeatureType) => {
    // Exit geometry editing and deselect feature when starting to draw
    setEditingGeometryFeatureId(null);
    featureContext.selectFeature(null);
    featureDrawing.startDrawing(type);
  }, [featureContext, featureDrawing]);

  // Stop geometry editing when selecting a different feature or deselecting
  const handleSelectFeature = useCallback((featureId: string | null) => {
    if (featureId !== editingGeometryFeatureId) {
      setEditingGeometryFeatureId(null);
    }
    featureContext.selectFeature(featureId);
  }, [featureContext, editingGeometryFeatureId]);

  // Get current drawing instruction
  const drawingInstruction = featureDrawing.mode !== 'none' ? DRAWING_INSTRUCTIONS[featureDrawing.mode] : null;

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar - changes when drawing */}
      <div className="absolute top-0 left-0 right-[360px] z-10 flex items-center justify-between px-3 h-10 bg-secondary/95 backdrop-blur pointer-events-auto">
        {drawingInstruction ? (
          <>
            <div className="flex items-center gap-2 text-primary">
              {drawingInstruction.icon}
              <span className="text-xs font-mono font-semibold">{drawingInstruction.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{drawingInstruction.hint}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={featureDrawing.cancelDrawing}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">SELECT MODE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">2D VIEW</span>
            </div>
          </>
        )}
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
            {/* Feature Toolbox - Collapsible */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full p-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  FEATURE TOOLBOX
                </h2>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 border-b border-border">
                  {selectedTrack ? (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Add Point */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={featureDrawing.mode === 'point' ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 justify-start gap-2"
                            onClick={() => handleStartDrawing('point')}
                            disabled={featureDrawing.isDrawing && featureDrawing.mode !== 'point'}
                          >
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs">Point</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Place a point marker</TooltipContent>
                      </Tooltip>
                      
                      {/* Add Line */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={featureDrawing.mode === 'line' ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 justify-start gap-2"
                            onClick={() => handleStartDrawing('line')}
                            disabled={featureDrawing.isDrawing && featureDrawing.mode !== 'line'}
                          >
                            <Spline className="h-4 w-4" />
                            <span className="text-xs">Line</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Draw a line path</TooltipContent>
                      </Tooltip>
                      
                      {/* Add Polygon */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={featureDrawing.mode === 'polygon' ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 justify-start gap-2"
                            onClick={() => handleStartDrawing('polygon')}
                            disabled={featureDrawing.isDrawing && featureDrawing.mode !== 'polygon'}
                          >
                            <Hexagon className="h-4 w-4" />
                            <span className="text-xs">Polygon</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Draw an area polygon</TooltipContent>
                      </Tooltip>
                      
                      {/* Save Viewpoint - functional */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 justify-start gap-2 hover:border-primary hover:text-primary"
                            onClick={() => setSaveDialogOpen(true)}
                            disabled={featureDrawing.isDrawing}
                          >
                            <Camera className="h-4 w-4" />
                            <span className="text-xs">Viewpoint</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Save current camera position</TooltipContent>
                      </Tooltip>
                      
                      {/* Detect Track - auto-detect asphalt */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 justify-start gap-2 hover:border-primary hover:text-primary col-span-2"
                            onClick={asphaltDetection.openDialog}
                            disabled={featureDrawing.isDrawing}
                          >
                            <Scan className="h-4 w-4" />
                            <span className="text-xs">Detect Track</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Auto-detect track surface from satellite imagery</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono">
                      Select a track to begin editing
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Feature List - Collapsible */}
            <CollapsibleFeatureList
              features={featureContext.features}
              selectedFeature={featureContext.selectedFeature}
              onSelectFeature={handleSelectFeature}
              hiddenFeatureIds={hiddenFeatureIds}
              onToggleVisibility={handleToggleVisibility}
            />
            
            {/* Feature Inspector */}
            <div className="p-3 border-b border-border">
              <h2 className="font-display text-sm font-semibold tracking-wider">
                FEATURE INSPECTOR
              </h2>
            </div>
            <div className="flex-1 overflow-auto">
              <FeatureInspector
                feature={featureContext.selectedFeature}
                isEditingGeometry={editingGeometryFeatureId === featureContext.selectedFeature?.id}
                onUpdateName={(name) => {
                  if (featureContext.selectedFeature) {
                    featureContext.updateName(featureContext.selectedFeature.id, name);
                  }
                }}
                onUpdateDescription={(desc) => {
                  if (featureContext.selectedFeature) {
                    featureContext.updateDescription(featureContext.selectedFeature.id, desc);
                  }
                }}
                onUpdateStyle={(style) => {
                  if (featureContext.selectedFeature) {
                    featureContext.updateStyle(featureContext.selectedFeature.id, style);
                  }
                }}
                onUpdateVisibility={(visibility) => {
                  if (featureContext.selectedFeature) {
                    featureContext.updateVisibility(featureContext.selectedFeature.id, visibility);
                  }
                }}
                onUpdateStatus={(status) => {
                  if (featureContext.selectedFeature) {
                    featureContext.updateStatus(featureContext.selectedFeature.id, status);
                  }
                }}
                onStartEditingGeometry={() => {
                  if (featureContext.selectedFeature) {
                    setEditingGeometryFeatureId(featureContext.selectedFeature.id);
                  }
                }}
                onStopEditingGeometry={() => {
                  setEditingGeometryFeatureId(null);
                }}
                onDelete={() => {
                  if (featureContext.selectedFeature) {
                    setEditingGeometryFeatureId(null);
                    featureContext.deleteFeature(featureContext.selectedFeature.id);
                  }
                }}
              />
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
      
      {/* Detect Track Dialog */}
      <DetectTrackDialog
        open={asphaltDetection.isDialogOpen}
        isDetecting={asphaltDetection.isDetecting}
        detectedCoords={asphaltDetection.detectedCoords}
        thresholds={asphaltDetection.thresholds}
        onClose={asphaltDetection.closeDialog}
        onRunDetection={asphaltDetection.runDetection}
        onApply={asphaltDetection.applyDetection}
        onUpdateThreshold={asphaltDetection.updateThreshold}
      />
    </div>
  );
}
