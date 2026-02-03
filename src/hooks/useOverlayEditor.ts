import { useState, useCallback, useRef } from 'react';
import type { 
  MapOverlay, 
  OverlayEditorState, 
  BoundingBox, 
  CornerHandle,
  OverlayStatus 
} from '@/types/overlay';
import { createDefaultOverlay, isValidBoundingBox } from '@/types/overlay';
import { useToast } from '@/hooks/use-toast';

const MAX_UNDO_STACK = 10;

export function useOverlayEditor(venueId: string | undefined) {
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<OverlayEditorState>({
    overlay: null,
    isDirty: false,
    isEditing: false,
    dragMode: 'none',
    activeCorner: null,
    lastSaved: null,
    undoStack: [],
  });

  // Push to undo stack before making changes
  const pushUndo = useCallback(() => {
    if (!state.overlay) return;
    setState(prev => ({
      ...prev,
      undoStack: [
        { ...prev.overlay! },
        ...prev.undoStack.slice(0, MAX_UNDO_STACK - 1),
      ],
    }));
  }, [state.overlay]);

  // Undo last change
  const undo = useCallback(() => {
    if (state.undoStack.length === 0) return;
    
    const [lastState, ...rest] = state.undoStack;
    setState(prev => ({
      ...prev,
      overlay: lastState,
      undoStack: rest,
      isDirty: true,
    }));
  }, [state.undoStack]);

  // Create new overlay
  const createOverlay = useCallback(() => {
    if (!venueId) return;
    const newOverlay = createDefaultOverlay(venueId);
    setState(prev => ({
      ...prev,
      overlay: newOverlay,
      isDirty: true,
      isEditing: true,
      undoStack: [],
    }));
  }, [venueId]);

  // Load existing overlay
  const loadOverlay = useCallback((overlay: MapOverlay) => {
    setState({
      overlay,
      isDirty: false,
      isEditing: false,
      dragMode: 'none',
      activeCorner: null,
      lastSaved: null,
      undoStack: [],
    });
  }, []);

  // Update overlay with autosave
  const updateOverlay = useCallback((updates: Partial<MapOverlay>) => {
    pushUndo();
    
    setState(prev => {
      if (!prev.overlay) return prev;
      
      const updated = { ...prev.overlay, ...updates };
      
      // Schedule autosave
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        // In production, this would call an API
        console.log('Autosaving overlay:', updated);
        setState(s => ({ ...s, isDirty: false, lastSaved: new Date() }));
        toast({
          description: 'Saved',
          duration: 1500,
        });
      }, 1000);
      
      return {
        ...prev,
        overlay: updated,
        isDirty: true,
      };
    });
  }, [pushUndo, toast]);

  // Update bounding box
  const updateBoundingBox = useCallback((box: Partial<BoundingBox>) => {
    if (!state.overlay) return;
    
    const newBox = { ...state.overlay.boundingBox, ...box };
    updateOverlay({ boundingBox: newBox });
  }, [state.overlay, updateOverlay]);

  // Set image URL
  const setImageUrl = useCallback((url: string) => {
    updateOverlay({ imageUrl: url });
  }, [updateOverlay]);

  // Toggle editing mode
  const setEditing = useCallback((editing: boolean) => {
    if (state.overlay?.isLocked && editing) {
      toast({
        title: 'Overlay Locked',
        description: 'Unlock the overlay to edit it.',
        variant: 'destructive',
      });
      return;
    }
    setState(prev => ({ ...prev, isEditing: editing }));
  }, [state.overlay?.isLocked, toast]);

  // Set drag mode
  const setDragMode = useCallback((mode: 'none' | 'corners' | 'move') => {
    if (state.overlay?.isLocked) return;
    setState(prev => ({ ...prev, dragMode: mode }));
  }, [state.overlay?.isLocked]);

  // Handle corner drag
  const handleCornerDrag = useCallback((corner: CornerHandle, lat: number, lng: number) => {
    if (!state.overlay || state.overlay.isLocked) return;
    
    const box = { ...state.overlay.boundingBox };
    
    switch (corner) {
      case 'nw':
        box.north = lat;
        box.west = lng;
        break;
      case 'ne':
        box.north = lat;
        box.east = lng;
        break;
      case 'sw':
        box.south = lat;
        box.west = lng;
        break;
      case 'se':
        box.south = lat;
        box.east = lng;
        break;
    }
    
    updateOverlay({ boundingBox: box });
  }, [state.overlay, updateOverlay]);

  // Handle move drag
  const handleMoveDrag = useCallback((deltaLat: number, deltaLng: number) => {
    if (!state.overlay || state.overlay.isLocked) return;
    
    const box = state.overlay.boundingBox;
    updateOverlay({
      boundingBox: {
        north: box.north + deltaLat,
        south: box.south + deltaLat,
        east: box.east + deltaLng,
        west: box.west + deltaLng,
      },
    });
  }, [state.overlay, updateOverlay]);

  // Center on venue
  const centerOnVenue = useCallback((venueLat: number, venueLng: number) => {
    if (!state.overlay) return;
    
    const box = state.overlay.boundingBox;
    const width = box.east - box.west;
    const height = box.north - box.south;
    
    updateOverlay({
      boundingBox: {
        north: venueLat + height / 2,
        south: venueLat - height / 2,
        east: venueLng + width / 2,
        west: venueLng - width / 2,
      },
    });
  }, [state.overlay, updateOverlay]);

  // Fit to venue bounds
  const fitToVenueBounds = useCallback((bounds: BoundingBox) => {
    updateOverlay({ boundingBox: bounds });
  }, [updateOverlay]);

  // Reset placement
  const resetPlacement = useCallback(() => {
    if (state.undoStack.length > 0) {
      const original = state.undoStack[state.undoStack.length - 1];
      updateOverlay({ boundingBox: original.boundingBox });
    }
  }, [state.undoStack, updateOverlay]);

  // Toggle lock
  const toggleLock = useCallback(() => {
    if (!state.overlay) return;
    updateOverlay({ isLocked: !state.overlay.isLocked });
    setState(prev => ({
      ...prev,
      isEditing: false,
      dragMode: 'none',
    }));
  }, [state.overlay, updateOverlay]);

  // Set status
  const setStatus = useCallback((status: OverlayStatus) => {
    updateOverlay({ status });
  }, [updateOverlay]);

  // Validation
  const canSave = state.overlay ? (
    state.overlay.imageUrl.length > 0 &&
    isValidBoundingBox(state.overlay.boundingBox)
  ) : false;

  return {
    // State
    overlay: state.overlay,
    isDirty: state.isDirty,
    isEditing: state.isEditing,
    dragMode: state.dragMode,
    activeCorner: state.activeCorner,
    lastSaved: state.lastSaved,
    canUndo: state.undoStack.length > 0,
    canSave,
    
    // Actions
    createOverlay,
    loadOverlay,
    updateOverlay,
    updateBoundingBox,
    setImageUrl,
    setEditing,
    setDragMode,
    handleCornerDrag,
    handleMoveDrag,
    centerOnVenue,
    fitToVenueBounds,
    resetPlacement,
    toggleLock,
    setStatus,
    undo,
  };
}
