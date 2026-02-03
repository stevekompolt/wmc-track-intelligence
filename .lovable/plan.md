

# Next Step: Viewpoints Foundation + Feature Toolbox

## Current State Summary

| Component | Status |
|-----------|--------|
| Map (Mapbox GL JS) | ✅ Implemented with style switcher, flyTo, pitch support |
| Track Context | ✅ Global track selection with localStorage persistence |
| Right Panel Structure | ✅ All 4 modes have 72px right panel overlaying map |
| Feature Toolbox | ⚠️ Placeholder only - no actual tools |
| Feature Inspector | ⚠️ Placeholder only - empty state |
| Viewpoints | ❌ Not implemented |

---

## What We're Building

This step implements the **Viewpoints system** end-to-end, plus makes the **Feature Toolbox** functional with the first real tool: "Save Viewpoint".

```text
+------------------------------------------------------------------+
|                                                      |           |
|                                                      |  FEATURE  |
|                                                      |  TOOLBOX  |
|                                                      |           |
|                                                      |  + Point  |
|                     MAP CANVAS                       |  + Line   |
|                                                      |  + Polygon|
|                                                      |  📸 Save  |  <-- First real tool
|                                                      |-----------|
|                                                      |  FEATURE  |
|                                                      |  INSPECTOR|
| [2D/3D] [N] [+/-]                                    |           |
| +------------------------------+                     | (viewpoint|
| | [Camera] [Drone] [Pit] [+]   |  <- NEW            |  form)    |
| +------------------------------+                     |           |
+------------------------------------------------------------------+
```

---

## Implementation Plan

### Phase 1: Data Foundation

**New File: `src/types/viewpoint.ts`**

Define TypeScript interfaces for:
- `Viewpoint` - Camera snapshot with metadata
- `ViewpointMode` - Junction linking viewpoint to app mode
- `CameraState` - Live camera capture from map
- `IconKey` - Union type of semantic icon names
- `AppMode` - 'editor' | 'ops' | 'media' | 'fan'

**New File: `src/lib/viewpointIcons.ts`**

Map semantic icon keys to Lucide icons:

| Key | Icon |
|-----|------|
| camera | Camera |
| drone | Plane |
| flag | Flag |
| pit | Wrench |
| map | Map |
| shield | Shield |
| broadcast | Radio |
| cube | Box |
| none | Circle |

---

### Phase 2: API & State Layer

**New File: `src/services/viewpointsApi.ts`**

API functions with mock data initially (same pattern as tracksApi.ts):
- `fetchViewpoints(venueId)` - Get all viewpoints for a venue
- `createViewpoint(data)` - Create viewpoint + mode junction records
- `updateViewpoint(id, data)` - Update existing viewpoint
- `deleteViewpoint(id)` - Delete viewpoint

Mock data will include 3-4 sample viewpoints per track to demonstrate the feature.

**New File: `src/hooks/useViewpoints.ts`**

React Query hook wrapping the API:
- Query key: `['viewpoints', venueId]`
- Enabled when venueId exists
- 5 minute stale time

**New File: `src/hooks/useCurrentMode.ts`**

Derives app mode from router path:

| Path | Mode |
|------|------|
| /editor | editor |
| /ops | ops |
| /media | media |
| /fan | fan |

**New File: `src/contexts/ViewpointContext.tsx`**

Global viewpoint state:
- `viewpoints` - All viewpoints for current venue
- `filteredViewpoints` - Filtered by current mode + visibility
- `activeViewpoint` - Currently selected viewpoint
- `setActiveViewpoint()` - Select and trigger flyTo
- `saveViewpoint()` - Create new viewpoint from camera state
- `mapRef` - Reference to TrackMap for camera control

---

### Phase 3: Map Integration

**Modify: `src/components/editor/TrackMap.tsx`**

Add imperative handle via `forwardRef` + `useImperativeHandle`:

| Method | Purpose |
|--------|---------|
| `flyToViewpoint(viewpoint)` | Animate camera to saved position |
| `captureCamera()` | Return current camera state |

Camera field mapping:
- `map.getCenter()` → latitude, longitude
- `map.getZoom()` → height
- `map.getBearing()` → heading
- `map.getPitch()` → pitch

---

### Phase 4: UI Components

**New Directory: `src/components/viewpoints/`**

**ViewpointButton.tsx**
- Single viewpoint button with icon from viewpointIcons.ts
- Shows name on hover via tooltip
- Highlighted border when active
- Click triggers flyToViewpoint()

**ViewpointSelector.tsx**
- Positioned: absolute bottom-left of map (above scale control)
- Desktop: horizontal button bar with icons
- Mobile: collapsible or dropdown
- Filters viewpoints by current mode
- Shows loading skeleton while fetching

**SaveViewpointDialog.tsx**
- Dialog/modal for creating new viewpoint
- Captures camera state when dialog opens
- Form fields:
  - Name (text, required)
  - Icon (select with icon preview)
  - Description (textarea, optional)
  - Modes (checkboxes: Editor, Ops, Media, Fan)
  - Visibility (checkboxes: Fans, Media, Ops)
  - Priority (number)
  - Status (Draft/Published radio)
- On save: calls createViewpoint API, refreshes list

---

### Phase 5: Feature Toolbox Update

**Modify: `src/pages/TrackEditor.tsx`**

Update Feature Toolbox section with real buttons:

When nothing selected:
- Add Point (disabled - placeholder for future)
- Add Line (disabled - placeholder for future)
- Add Polygon (disabled - placeholder for future)
- **Save Viewpoint** (enabled - opens SaveViewpointDialog)

When a feature is selected (future):
- Edit Geometry
- Duplicate
- Delete
- Save Viewpoint from Feature

---

### Phase 6: Integration

**Modify: `src/components/layout/SharedMapContainer.tsx`**
- Add ref to TrackMap component
- Pass ref to ViewpointContext
- Add ViewpointSelector overlay (bottom-left)

**Modify: `src/App.tsx`**
- Wrap with ViewpointProvider inside TrackProvider

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/viewpoint.ts` | Create | Type definitions |
| `src/lib/viewpointIcons.ts` | Create | Icon mapping utility |
| `src/services/viewpointsApi.ts` | Create | API + mock data |
| `src/hooks/useViewpoints.ts` | Create | React Query hook |
| `src/hooks/useCurrentMode.ts` | Create | Mode detection hook |
| `src/contexts/ViewpointContext.tsx` | Create | Global viewpoint state |
| `src/components/viewpoints/ViewpointButton.tsx` | Create | Single viewpoint button |
| `src/components/viewpoints/ViewpointSelector.tsx` | Create | Bottom-left selector bar |
| `src/components/viewpoints/SaveViewpointDialog.tsx` | Create | Save viewpoint modal |
| `src/components/editor/TrackMap.tsx` | Modify | Add forwardRef + imperative handle |
| `src/components/layout/SharedMapContainer.tsx` | Modify | Add ViewpointSelector + map ref |
| `src/pages/TrackEditor.tsx` | Modify | Add real toolbox buttons |
| `src/App.tsx` | Modify | Add ViewpointProvider |

---

## Runtime Flow

1. **User selects a venue** → Viewpoints load from API
2. **User navigates to /editor** → ViewpointSelector shows Editor-visible viewpoints
3. **User clicks a viewpoint button** → Map animates to that camera position
4. **User clicks "Save Viewpoint" in Toolbox** → Current camera captured, dialog opens
5. **User fills form and saves** → API call creates viewpoint, list refreshes
6. **User switches to /ops** → ViewpointSelector filters to Ops-visible viewpoints

---

## Design Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Map is primary surface | ✅ Viewpoints overlay, don't resize map |
| No left sidebar | ✅ Selector is bottom-left floating overlay |
| No bottom panels | ✅ Selector is compact button bar |
| Right column overlays map | ✅ Already implemented |
| Map never reflows | ✅ No layout changes |
| Mode controls visibility | ✅ Viewpoints filtered by mode |
| Mode switch doesn't reload map | ✅ Map persists in SharedMapContainer |
| Dark UI, broadcast-grade feel | ✅ Using existing theme |

---

## Mock Data Preview

Initial mock viewpoints for demonstration:

| Name | Icon | Visible In |
|------|------|------------|
| Start/Finish | flag | All modes |
| Pit Lane Overview | pit | Editor, Ops, Media |
| Turn 1 Entry | camera | Editor, Media |
| Aerial View | drone | All modes |
| Broadcast Tower | broadcast | Media only |

