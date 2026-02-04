
# Add Easy Delete for Map Layers

## Overview

Make it easy to delete any map layer (features or overlays) by adding delete functionality in two places:
1. **Delete button in the Overlay Inspector** - Matching the existing pattern in Feature Inspector
2. **Delete button in the Map Layers list** - Quick delete with confirmation for any item

## Current State

| Component | Delete Button | Status |
|-----------|--------------|--------|
| FeatureInspector | Yes (bottom of panel) | Working |
| OverlayEditorPanel | No | **Needs adding** |
| MapItemList | No | **Needs adding** |

## Changes

### 1. Add Delete to OverlayEditorPanel

Add a "Delete Overlay" button at the bottom of the panel (matching the FeatureInspector pattern).

**File**: `src/components/editor/OverlayEditorPanel.tsx`
- Add `onDelete` prop to the component interface
- Add destructive Button with Trash2 icon below the existing Save/Undo buttons
- Button text: "Delete Overlay"

### 2. Add Delete to MapItemList

Add a small trash icon button next to each item in the list for quick deletion.

**File**: `src/components/editor/MapItemList.tsx`
- Add `onDeleteItem` callback prop
- Add Trash2 icon button next to each item (between eye toggle and status badge)
- Include confirmation dialog to prevent accidental deletion

### 3. Wire Up Delete in TrackEditor

Connect the new delete callbacks to the context methods.

**File**: `src/pages/TrackEditor.tsx`
- Pass `onDelete` prop to OverlayEditorPanel, calling `overlayContext.deleteOverlay`
- Clear selection after deletion

### 4. Update CollapsibleMapItemList

Pass through the delete callback to MapItemList.

**File**: `src/components/editor/CollapsibleMapItemList.tsx`
- Add `onDeleteItem` prop
- Forward to MapItemList

## UI Design

### Map Layers List (each row)
```
[Icon] Layer Name      [Eye] [Trash] [Status]
                         ^      ^
                         |      +-- New delete button
                         +-- Existing visibility toggle
```

### Delete Confirmation Dialog
```
+----------------------------------+
|  Delete Layer?                   |
|                                  |
|  This will permanently delete    |
|  "Track Surface" from the map.   |
|                                  |
|  This action cannot be undone.   |
|                                  |
|         [Cancel]  [Delete]       |
+----------------------------------+
```

### Overlay Inspector (bottom section)
```
+----------------------------------+
|  [Undo]  [   Save   ]            |  <- Existing
+----------------------------------+
|  [     Delete Overlay      ]     |  <- New button
+----------------------------------+
```

## Technical Details

### MapItemList Props Addition

```typescript
interface MapItemListProps {
  // ... existing props
  onDeleteItem?: (id: string, type: 'feature' | 'overlay') => void;
}
```

### OverlayEditorPanel Props Addition

```typescript
interface OverlayEditorPanelProps {
  // ... existing props
  onDelete?: () => void;
}
```

### Delete Handler in TrackEditor

```typescript
const handleDeleteItem = useCallback((id: string, type: SelectionType) => {
  if (type === 'feature') {
    setEditingGeometryFeatureId(null);
    featureContext.deleteFeature(id);
  } else if (type === 'overlay') {
    overlayContext.deleteOverlay(id);
  }
  handleSelectItem(null, null);
}, [featureContext, overlayContext, handleSelectItem]);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editor/MapItemList.tsx` | Add delete button with confirmation dialog |
| `src/components/editor/CollapsibleMapItemList.tsx` | Pass through delete callback |
| `src/components/editor/OverlayEditorPanel.tsx` | Add delete button at bottom |
| `src/pages/TrackEditor.tsx` | Wire up delete handlers |

## Benefits

1. Consistent delete UX across features and overlays
2. Quick delete from list without needing to open inspector
3. Confirmation dialog prevents accidental deletions
4. Follows existing patterns used by FeatureInspector
