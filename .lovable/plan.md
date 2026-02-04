
# Unify Overlays with Features for Consistent Visibility Management

## Status: ✅ IMPLEMENTED

## Overview

Overlays and features are now unified in the UI. Each overlay is displayed in the same list as geometric features, allowing them to be toggled on/off with the same visibility controls.

## Architecture

We chose **Option B: Keep separate but unified UI** - data models remain separate but are presented in a unified interface. This minimizes breaking changes while achieving the goal.

## Implemented Files

### New Files

| File | Purpose |
|------|---------|
| `src/contexts/OverlayContext.tsx` | Context for multi-overlay CRUD + visibility state |
| `src/services/overlaysApi.ts` | Mock API for overlay persistence (mirrors featuresApi) |
| `src/components/editor/MapItemList.tsx` | Unified list component for features + overlays |
| `src/components/editor/CollapsibleMapItemList.tsx` | Collapsible wrapper for unified list |
| `src/hooks/useMultiOverlayRenderer.ts` | Multi-overlay renderer with editing support |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added OverlayProvider to provider tree |
| `src/hooks/useSharedFeatureRenderer.ts` | Added overlay rendering for non-editor modes |
| `src/components/layout/SharedMapContainer.tsx` | Uses OverlayContext for overlay visibility |
| `src/pages/TrackEditor.tsx` | Removed Overlay tab, unified into single Features view with Image button |

## Key Changes

1. **Unified Map Layers List**: Features and overlays appear in a single "MAP LAYERS" list
2. **Single Toolbox**: Added "Image" button alongside Point/Line/Polygon for creating overlays
3. **Dynamic Inspector**: Shows OverlayEditorPanel when overlay selected, FeatureInspector when feature selected
4. **Eye Toggle**: Both features and overlays have visibility toggles in the list
5. **Mode-aware visibility**: Overlays respect visibleToFans/Media/Ops flags like features

## Visual Result

```text
FEATURE TOOLBOX
+--------+  +--------+  +--------+  +--------+  +--------+  +--------+
| Point  |  | Line   |  | Polygon|  | Image  |  |Viewpoint| | Detect |
+--------+  +--------+  +--------+  +--------+  +--------+  +--------+

MAP LAYERS (4)
+-------------------------------------------+
| [Img] Track Map Overlay       👁 pub       |  <- Overlay
| [Hex] Track Surface           👁 draft     |  <- Feature
| [Pin] Start Line              👁 draft     |  <- Feature
| [Img] Sponsor Banner          🚫 draft     |  <- Overlay (hidden)
+-------------------------------------------+

FEATURE INSPECTOR / OVERLAY INSPECTOR
(Dynamic based on selection)
```

## Benefits Achieved

1. ✅ Single list to manage all map content
2. ✅ Consistent visibility toggle behavior
3. ✅ Multiple overlays supported
4. ✅ Same mode-aware visibility for overlays
5. ✅ Familiar UI pattern - no separate tabs
