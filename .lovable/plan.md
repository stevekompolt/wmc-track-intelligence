

# Improve Overlay Editing UX: Auto-Collapse Panels + Drag-to-Reorder Layers

## Problem

The right panel stacks four collapsible sections (Feature Toolbox, Map Layers, Viewpoints, Inspector) vertically. To reach the Overlay Editor/Inspector at the bottom, the user must manually collapse the panels above. Layer z-order is set via a numeric input instead of intuitive drag-and-drop.

## Changes

### 1. Auto-collapse panels when an overlay is selected

**File: `src/pages/TrackEditor.tsx`**

- Add state: `toolboxOpen`, `viewpointsOpen` (default `true`)
- When `selectionType` changes to `'overlay'`, auto-collapse Feature Toolbox and Viewpoints panels (set both to `false`)
- When selection clears or switches to `'feature'`, restore them to `true`
- Pass `open`/`onOpenChange` to the Feature Toolbox `<Collapsible>` and `<ViewpointManagerPanel>`
- This immediately surfaces the Overlay Inspector without manual collapsing

### 2. Add `isCollapsed` prop to ViewpointManagerPanel

**File: `src/components/viewpoints/ViewpointManagerPanel.tsx`**

- Accept `open` and `onOpenChange` props to allow external control of its collapsible state

### 3. Drag-to-reorder layers in MapItemList

**File: `src/components/editor/MapItemList.tsx`**

- Add drag-and-drop reordering using native HTML drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
- Add a drag handle grip icon to each row
- On drop, call a new `onReorder` callback with the reordered item list

**File: `src/components/editor/CollapsibleMapItemList.tsx`**

- Accept and forward `onReorderItems` callback
- On reorder, update `zOrder` values for all affected items by calling context update methods

**File: `src/pages/TrackEditor.tsx`**

- Implement `handleReorderItems` that updates `zOrder` on each reordered feature/overlay via their respective contexts

### 4. Remove z-order numeric input from OverlayEditorPanel

**File: `src/components/editor/OverlayEditorPanel.tsx`**

- Remove the manual z-order `<Input>` field since ordering is now handled by drag-and-drop in the layer list

## Result

- Selecting an overlay auto-collapses unneeded panels, immediately showing the inspector
- Layer ordering is intuitive drag-and-drop instead of manual number entry
- No structural changes to data model — still uses `zOrder` under the hood

