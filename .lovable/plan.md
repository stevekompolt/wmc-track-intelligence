
# Unify Overlays with Features for Consistent Visibility Management

## Overview

Currently, overlays and features are separate systems with different UI, state management, and rendering. This plan integrates overlays into the feature list so they can be toggled on/off just like geometric features, supporting multiple overlays.

## Architecture Approach

Two options were considered:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A: Merge into VenueFeature | Add `type: 'overlay'` to VenueFeature with overlay-specific fields | Single unified list, simple visibility | Requires schema changes, complex type unions |
| B: Keep separate but unified UI | Keep MapOverlay type but display in same list, same visibility state | Minimal type changes, cleaner separation | Two data sources to sync |

**Recommended: Option B** - Keep data models separate but present a unified UI. This minimizes breaking changes while achieving the goal.

## Data Model Changes

### New: `src/types/overlay.ts` additions

Add helper to convert overlay to a "list item" format compatible with feature list rendering.

### New: `src/contexts/OverlayContext.tsx`

Create a context to manage multiple overlays (similar to FeatureContext):
- `overlays: MapOverlay[]` - All overlays for current venue
- `selectedOverlay: MapOverlay | null`
- `hiddenOverlayIds: Set<string>` - Local visibility toggle (matches hiddenFeatureIds pattern)
- CRUD operations for multiple overlays

## UI Changes

### File: `src/components/editor/FeatureList.tsx`

Rename to `MapItemList.tsx` and accept both features AND overlays as a unified list:

```
type MapItem = 
  | { type: 'feature'; data: VenueFeature }
  | { type: 'overlay'; data: MapOverlay };
```

Each item displays:
- Icon (Point/Line/Polygon/Image icon for overlay)
- Name
- Eye toggle
- Status badge

### File: `src/components/editor/CollapsibleFeatureList.tsx`

Update to show combined list of features + overlays, with section headers:
- "Overlays (2)" collapsible section
- "Features (5)" collapsible section

OR: Single unified list sorted by zOrder

### File: `src/pages/TrackEditor.tsx`

- Remove separate "Overlay" tab
- Integrate overlay creation into Feature Toolbox (add "Image Overlay" button)
- When overlay is selected, show OverlayEditorPanel in the inspector area
- When feature is selected, show FeatureInspector

## Rendering Changes

### File: `src/hooks/useMapOverlayRenderer.ts`

Update to support multiple overlays:
- Accept `overlays: MapOverlay[]` instead of single `overlay`
- Accept `hiddenOverlayIds: Set<string>` for visibility filtering
- Create unique source/layer IDs per overlay: `overlay-image-{id}`, `overlay-layer-{id}`
- Only render overlays not in hiddenOverlayIds

### File: `src/hooks/useSharedFeatureRenderer.ts`

Add overlay rendering for non-editor modes:
- Filter overlays by mode visibility flags (visibleToFans, etc.)
- Use same source/layer ID pattern

## New Files

| File | Purpose |
|------|---------|
| `src/contexts/OverlayContext.tsx` | Manage multiple overlays with CRUD + visibility |
| `src/services/overlaysApi.ts` | Mock API for overlay persistence (mirrors featuresApi) |
| `src/components/editor/MapItemList.tsx` | Unified list component for features + overlays |

## Modified Files

| File | Changes |
|------|---------|
| `src/types/overlay.ts` | Add list item conversion helper |
| `src/hooks/useMapOverlayRenderer.ts` | Support multiple overlays + hiddenOverlayIds |
| `src/hooks/useSharedFeatureRenderer.ts` | Add overlay rendering for non-editor modes |
| `src/pages/TrackEditor.tsx` | Remove Overlay tab, unify into single Features view |
| `src/components/editor/OverlayEditorPanel.tsx` | Minor: accept overlay from context instead of props |
| `src/components/layout/SharedMapContainer.tsx` | Add OverlayContext provider + renderer |
| `src/App.tsx` | Add OverlayProvider to provider tree |

## Technical Implementation

### Phase 1: Create OverlayContext (similar to FeatureContext)

```typescript
// src/contexts/OverlayContext.tsx
interface OverlayContextType {
  overlays: MapOverlay[];
  selectedOverlay: MapOverlay | null;
  selectOverlay: (id: string | null) => void;
  hiddenOverlayIds: Set<string>;
  toggleOverlayVisibility: (id: string) => void;
  createOverlay: () => Promise<MapOverlay>;
  updateOverlay: (id: string, updates: Partial<MapOverlay>) => void;
  deleteOverlay: (id: string) => void;
}
```

### Phase 2: Multi-Overlay Renderer

Update useMapOverlayRenderer to iterate over multiple overlays:
- For each visible overlay, create source `overlay-image-{overlay.id}`
- Create layer `overlay-layer-{overlay.id}` with opacity from overlay settings
- Sort by zOrder for proper stacking

### Phase 3: Unified Map Item List

Create component that renders both features and overlays in one list:
- Overlay items use Image icon
- Clicking overlay selects it and shows OverlayEditorPanel
- Eye toggle updates hiddenOverlayIds
- Same styling as feature items

### Phase 4: Remove Overlay Tab

Update TrackEditor to show single unified view:
- Add "Image" button to Feature Toolbox for creating overlays
- Inspector area dynamically shows FeatureInspector or OverlayEditorPanel based on selection

## Visual Mockup

```text
FEATURE TOOLBOX
+--------+  +--------+  +--------+  +--------+
| Point  |  | Line   |  | Polygon|  | Image  |  <- NEW
+--------+  +--------+  +--------+  +--------+

MAP LAYERS (7)
+-------------------------------------------+
| [Img] Track Map Overlay      [F][O] 👁 pub |  <- Overlay
| [Hex] Track Surface          [F][M][O] 👁  |  <- Feature
| [Pin] Start Line             [F] 👁 draft  |  <- Feature
| [Img] Sponsor Banner         [F] 🚫 draft  |  <- Overlay (hidden)
+-------------------------------------------+

INSPECTOR
(Shows OverlayEditorPanel when overlay selected)
(Shows FeatureInspector when feature selected)
```

## Benefits

1. Single list to manage all map content
2. Consistent visibility toggle behavior across all item types
3. Multiple overlays supported
4. Same mode-aware visibility (Fan/Media/Ops) for overlays
5. Familiar UI pattern - no new concepts to learn

## Migration Notes

- Existing single overlay data will be migrated to array format
- Local storage key changes from single overlay to array
- No breaking changes to feature data
