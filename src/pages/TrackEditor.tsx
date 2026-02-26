import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layers, MousePointer2, MapPin, Spline, Hexagon, Camera, Image as ImageIcon, ChevronDown, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { OverlayEditorPanel } from '@/components/editor/OverlayEditorPanel';
import { ViewpointManagerPanel } from '@/components/viewpoints/ViewpointManagerPanel';
import { FeatureInspector } from '@/components/editor/FeatureInspector';
import { CollapsibleMapItemList } from '@/components/editor/CollapsibleMapItemList';
import { DetectTrackDialog } from '@/components/editor/DetectTrackDialog';
import { useTrackContext } from '@/contexts/TrackContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import type { MapEngine } from '@/contexts/ViewpointContext';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { useOverlayContext } from '@/contexts/OverlayContext';
import { useMultiOverlayRenderer } from '@/hooks/useMultiOverlayRenderer';
import { useFeatureDrawing } from '@/hooks/useFeatureDrawing';
import { useFeatureRenderer } from '@/hooks/useFeatureRenderer';
import { useFeatureGeometryEditor } from '@/hooks/useFeatureGeometryEditor';
import { useAsphaltDetection } from '@/hooks/useAsphaltDetection';
import type { CornerHandle, BoundingBox } from '@/types/overlay';
import type { FeatureType, FeatureGeometry, PolygonGeometry } from '@/types/feature';
import { DEFAULT_FEATURE_STYLE } from '@/types/feature';
import mapboxgl from 'mapbox-gl';

// Selection type for unified list
type SelectionType = 'feature' | 'overlay' | null;

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
  const { mapRef, editingViewpoint, setEditingViewpoint, engine } = useViewpointContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [editingGeometryFeatureId, setEditingGeometryFeatureId] = useState<string | null>(null);
  const [hiddenFeatureIds, setHiddenFeatureIds] = useState<Set<string>>(new Set());
  
  // Selection state - unified for features and overlays
  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  
  // Overlay editor state
  const [overlayDragMode, setOverlayDragMode] = useState<'none' | 'corners' | 'move'>('none');
  const [overlayGhostBounds, setOverlayGhostBounds] = useState<BoundingBox | null>(null);

  // Toggle feature visibility on map
  const handleToggleFeatureVisibility = useCallback((featureId: string) => {
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

  // Feature context - shared across all views
  const featureContext = useFeatureContext();
  
  // Overlay context - shared across all views
  const overlayContext = useOverlayContext();

  // Handle unified selection
  const handleSelectItem = useCallback((id: string | null, type: SelectionType) => {
    if (id === null || type === null) {
      featureContext.selectFeature(null);
      overlayContext.selectOverlay(null);
      setSelectionType(null);
      setEditingGeometryFeatureId(null);
    } else if (type === 'feature') {
      featureContext.selectFeature(id);
      overlayContext.selectOverlay(null);
      setSelectionType('feature');
      if (id !== editingGeometryFeatureId) {
        setEditingGeometryFeatureId(null);
      }
    } else if (type === 'overlay') {
      overlayContext.selectOverlay(id);
      featureContext.selectFeature(null);
      setSelectionType('overlay');
      setEditingGeometryFeatureId(null);
    }
  }, [featureContext, overlayContext, editingGeometryFeatureId]);

  // Get selected item ID
  const selectedItemId = selectionType === 'feature' 
    ? featureContext.selectedFeature?.id || null
    : selectionType === 'overlay'
    ? overlayContext.selectedOverlay?.id || null
    : null;

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
    
    checkMapInstance();
    const timeout = setTimeout(checkMapInstance, 1000);
    return () => clearTimeout(timeout);
  }, [mapRef, selectedTrack]);

  // Overlay drag handlers
  const handleCornerDrag = useCallback((corner: CornerHandle, lat: number, lng: number) => {
    if (!overlayContext.selectedOverlay) return;
    const currentBox = overlayContext.selectedOverlay.boundingBox;
    const updates: Partial<BoundingBox> = {};
    
    switch (corner) {
      case 'nw':
        updates.north = lat;
        updates.west = lng;
        break;
      case 'ne':
        updates.north = lat;
        updates.east = lng;
        break;
      case 'sw':
        updates.south = lat;
        updates.west = lng;
        break;
      case 'se':
        updates.south = lat;
        updates.east = lng;
        break;
    }
    
    overlayContext.updateBoundingBox(overlayContext.selectedOverlay.id, updates);
  }, [overlayContext]);

  const handleMoveDrag = useCallback((deltaLat: number, deltaLng: number) => {
    if (!overlayContext.selectedOverlay) return;
    const box = overlayContext.selectedOverlay.boundingBox;
    overlayContext.updateOverlay(overlayContext.selectedOverlay.id, {
      boundingBox: {
        north: box.north + deltaLat,
        south: box.south + deltaLat,
        east: box.east + deltaLng,
        west: box.west + deltaLng,
      },
    });
  }, [overlayContext]);

  // Center overlay on venue
  const handleCenterOnVenue = useCallback(() => {
    if (!selectedTrack || !overlayContext.selectedOverlay) return;
    const box = overlayContext.selectedOverlay.boundingBox;
    const width = box.east - box.west;
    const height = box.north - box.south;
    overlayContext.updateOverlay(overlayContext.selectedOverlay.id, {
      boundingBox: {
        north: selectedTrack.latitude + height / 2,
        south: selectedTrack.latitude - height / 2,
        east: selectedTrack.longitude + width / 2,
        west: selectedTrack.longitude - width / 2,
      },
    });
  }, [selectedTrack, overlayContext]);

  // Fit overlay to venue bounds
  const handleFitToVenueBounds = useCallback(() => {
    if (!selectedTrack || !overlayContext.selectedOverlay) return;
    const span = 0.01;
    overlayContext.updateOverlay(overlayContext.selectedOverlay.id, {
      boundingBox: {
        north: selectedTrack.latitude + span,
        south: selectedTrack.latitude - span,
        east: selectedTrack.longitude + span,
        west: selectedTrack.longitude - span,
      },
    });
  }, [selectedTrack, overlayContext]);

  // Reset overlay placement
  const handleResetPlacement = useCallback(() => {
    if (!overlayContext.selectedOverlay) return;
    overlayContext.updateOverlay(overlayContext.selectedOverlay.id, {
      boundingBox: { north: 0, south: 0, east: 0, west: 0 },
    });
  }, [overlayContext]);

  // Initialize multi-overlay renderer
  useMultiOverlayRenderer({
    map: mapInstance,
    overlays: overlayContext.overlays,
    hiddenOverlayIds: overlayContext.hiddenOverlayIds,
    editingOverlayId: overlayContext.selectedOverlay?.id,
    dragMode: overlayDragMode,
    ghostBounds: overlayGhostBounds,
    onCornerDrag: handleCornerDrag,
    onMoveDrag: handleMoveDrag,
  });

  // Initialize feature renderer
  useFeatureRenderer({
    map: mapInstance,
    features: featureContext.features,
    partialCoords: featureDrawing.partialCoords,
    drawingMode: featureDrawing.mode,
    selectedFeatureId: featureContext.selectedFeature?.id || null,
    editingGeometryFeatureId,
    hiddenFeatureIds,
    onFeatureClick: (id) => handleSelectItem(id, 'feature'),
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
    setEditingGeometryFeatureId(null);
    handleSelectItem(null, null);
    featureDrawing.startDrawing(type);
  }, [handleSelectItem, featureDrawing]);

  // Handle creating new overlay
  const handleCreateOverlay = useCallback(async () => {
    const overlay = await overlayContext.createOverlay();
    if (overlay) {
      setSelectionType('overlay');
    }
  }, [overlayContext]);

  // Handle delete item from unified list
  const handleDeleteItem = useCallback((id: string, type: SelectionType) => {
    if (type === 'feature') {
      setEditingGeometryFeatureId(null);
      featureContext.deleteFeature(id);
    } else if (type === 'overlay') {
      overlayContext.deleteOverlay(id);
    }
    handleSelectItem(null, null);
  }, [featureContext, overlayContext, handleSelectItem]);

  // Get current drawing instruction
  const drawingInstruction = featureDrawing.mode !== 'none' ? DRAWING_INSTRUCTIONS[featureDrawing.mode] : null;

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
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
              <span className="text-xs font-mono text-muted-foreground">{engine === 'cesium' ? '3D VIEW' : '2D VIEW'}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Panel */}
      <div className="absolute top-0 right-0 bottom-0 w-[360px] z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col pointer-events-auto">
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
                  
                  {/* Add Image Overlay */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2 hover:border-primary hover:text-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                        onClick={handleCreateOverlay}
                        disabled={featureDrawing.isDrawing}
                      >
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-xs">Image</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Add an image overlay</TooltipContent>
                  </Tooltip>
                  
                  {/* Save Viewpoint */}
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
                  
                  {/* Detect Track */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start gap-2 hover:border-primary hover:text-primary"
                        onClick={asphaltDetection.openDialog}
                        disabled={featureDrawing.isDrawing}
                      >
                        <Scan className="h-4 w-4" />
                        <span className="text-xs">Detect</span>
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
        
        {/* Unified Map Layers List */}
        <CollapsibleMapItemList
          features={featureContext.features}
          overlays={overlayContext.overlays}
          selectedItemId={selectedItemId}
          selectedItemType={selectionType}
          onSelectItem={handleSelectItem}
          hiddenFeatureIds={hiddenFeatureIds}
          hiddenOverlayIds={overlayContext.hiddenOverlayIds}
          onToggleFeatureVisibility={handleToggleFeatureVisibility}
          onToggleOverlayVisibility={overlayContext.toggleOverlayVisibility}
          onDeleteItem={handleDeleteItem}
        />
        
        {/* Viewpoints Manager */}
        <ViewpointManagerPanel />
        
        {/* Dynamic Inspector - shows Feature or Overlay inspector based on selection */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            {selectionType === 'overlay' ? 'OVERLAY INSPECTOR' : 'FEATURE INSPECTOR'}
          </h2>
        </div>
        <div className="flex-1 overflow-auto">
          {selectionType === 'overlay' && overlayContext.selectedOverlay ? (
            <OverlayEditorPanel
              overlay={overlayContext.selectedOverlay}
              isDirty={false}
              isEditing={true}
              dragMode={overlayDragMode}
              canUndo={false}
              canSave={true}
              lastSaved={null}
              isPreviewingSnap={!!overlayGhostBounds}
              onUpdateOverlay={(updates) => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.updateOverlay(overlayContext.selectedOverlay.id, updates);
                }
              }}
              onUpdateBoundingBox={(box) => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.updateBoundingBox(overlayContext.selectedOverlay.id, box);
                }
              }}
              onSetImageUrl={(url) => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.updateImageUrl(overlayContext.selectedOverlay.id, url);
                }
              }}
              onSetEditing={() => {}}
              onSetDragMode={setOverlayDragMode}
              onCenterOnVenue={handleCenterOnVenue}
              onFitToVenueBounds={handleFitToVenueBounds}
              onResetPlacement={handleResetPlacement}
              onToggleLock={() => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.toggleLock(overlayContext.selectedOverlay.id);
                }
              }}
              onSetStatus={(status) => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.updateStatus(overlayContext.selectedOverlay.id, status);
                }
              }}
              onUndo={() => {}}
              onCreateOverlay={handleCreateOverlay}
              onDelete={() => {
                if (overlayContext.selectedOverlay) {
                  overlayContext.deleteOverlay(overlayContext.selectedOverlay.id);
                  handleSelectItem(null, null);
                }
              }}
            />
          ) : (
            <FeatureInspector
              feature={featureContext.selectedFeature}
              isEditingGeometry={editingGeometryFeatureId === featureContext.selectedFeature?.id}
              isHidden={featureContext.selectedFeature ? hiddenFeatureIds.has(featureContext.selectedFeature.id) : false}
              onToggleHidden={featureContext.selectedFeature ? () => handleToggleFeatureVisibility(featureContext.selectedFeature!.id) : undefined}
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
          )}
        </div>
      </div>
      
      {/* Save/Edit Viewpoint Dialog */}
      <SaveViewpointDialog 
        open={saveDialogOpen || !!editingViewpoint} 
        onOpenChange={(open) => {
          if (!open) {
            setSaveDialogOpen(false);
            setEditingViewpoint(null);
          }
        }}
        viewpoint={editingViewpoint}
      />
      
      {/* Detect Track Dialog */}
      <DetectTrackDialog
        open={asphaltDetection.isDialogOpen}
        isDetecting={asphaltDetection.isDetecting}
        detectedCoords={asphaltDetection.detectedCoords}
        thresholds={asphaltDetection.thresholds}
        useBoundary={asphaltDetection.useBoundary}
        bufferWidth={asphaltDetection.bufferWidth}
        selectedLineCoords={
          featureContext.selectedFeature?.type === 'line' 
            ? (featureContext.selectedFeature.geometry as { coordinates: [number, number][] }).coordinates 
            : null
        }
        onClose={asphaltDetection.closeDialog}
        onRunDetection={() => {
          const lineCoords = featureContext.selectedFeature?.type === 'line'
            ? (featureContext.selectedFeature.geometry as { coordinates: [number, number][] }).coordinates
            : undefined;
          asphaltDetection.runDetection(lineCoords);
        }}
        onApply={asphaltDetection.applyDetection}
        onUpdateThreshold={asphaltDetection.updateThreshold}
        onSetUseBoundary={asphaltDetection.setUseBoundary}
        onSetBufferWidth={asphaltDetection.setBufferWidth}
      />
    </div>
  );
}
