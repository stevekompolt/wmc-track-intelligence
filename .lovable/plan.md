

# Viewpoint Management: List & Edit

## Current State
- **ViewpointSelector** (bottom-left of map): shows icon buttons for filtered viewpoints, plus a "+" to create new ones. No way to see a full list with details or edit/delete existing viewpoints.
- **SaveViewpointDialog**: create-only — no edit mode.
- **useUpdateViewpoint / useDeleteViewpoint**: hooks exist but are unused in the UI.
- **viewpointsApi.ts**: `updateViewpoint` and `deleteViewpoint` are implemented (mock).

## Plan

### 1. New component: `ViewpointManagerPanel.tsx`
A collapsible panel in the editor sidebar (similar to `CollapsibleMapItemList`) that lists all viewpoints for the selected track:
- Each row shows: icon, name, status badge (draft/published), priority
- Click row → flies to that viewpoint (calls `setActiveViewpoint`)
- Edit button → opens `SaveViewpointDialog` in edit mode
- Delete button → confirmation dialog → calls `useDeleteViewpoint`

### 2. Update `SaveViewpointDialog` to support edit mode
- Accept an optional `viewpoint` prop (existing viewpoint to edit)
- Pre-fill form fields when editing
- On submit: call `updateViewpoint` instead of `createViewpoint`
- Change dialog title to "Edit Viewpoint" when editing

### 3. Wire into `ViewpointContext`
- Expose `updateViewpoint` and `deleteViewpoint` actions from the context
- Add an `editingViewpoint` state to track which viewpoint is being edited

### 4. Add panel to editor layout
- Add `ViewpointManagerPanel` to the editor sidebar (e.g., inside `OverlayEditorPanel` or as a sibling collapsible section)
- Only visible in `editor` mode

### Files Changed
- `src/components/viewpoints/SaveViewpointDialog.tsx` — add edit mode
- `src/components/viewpoints/ViewpointManagerPanel.tsx` — new file, list + edit/delete
- `src/contexts/ViewpointContext.tsx` — expose update/delete actions
- Editor layout file (wherever the sidebar is composed) — add the panel

