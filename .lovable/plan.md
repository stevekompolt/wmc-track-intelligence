
# Display Features Across All Views with Mode-Aware Visibility

## Problem

Features created in the Track Editor are not showing in Fan, Media, or Ops views because:

1. **Rendering is Editor-Only**: The `useFeatureRenderer` hook is only called in `TrackEditor.tsx`
2. **Cleanup on Unmount**: When navigating away from `/editor`, the TrackEditor component unmounts and removes all feature layers from the map
3. **No Shared Feature State**: Other views don't load or render features at all
4. **Visibility Flags Unused**: Each feature has `visibleToFans`, `visibleToMedia`, `visibleToOps` flags, but these are only editable - they're never used to filter what's shown in each view

---

## Solution Architecture

Move feature loading and rendering to the shared map layer, with mode-aware visibility filtering.

```text
SharedMapContainer
    │
    ├── TrackMap (already shared)
    │
    └── SharedFeatureRenderer (NEW)
            │
            ├── Loads features for current track
            ├── Filters by current mode's visibility
            └── Renders read-only layers on map
```

Each view can optionally add editing capabilities on top (TrackEditor adds drawing, selection, geometry editing).

---

## Technical Changes

### File 1: Create `src/contexts/FeatureContext.tsx`

A new context to share feature state across all views:

| Export | Description |
|--------|-------------|
| `FeatureProvider` | Wraps the app and provides feature state |
| `useFeatureContext` | Hook to access features in any component |
| Features loaded by venue | Uses `selectedTrack.id` to load features |
| Mode-aware filtering | Exposes `visibleFeatures` filtered by current mode |

### File 2: Create `src/hooks/useSharedFeatureRenderer.ts`

A read-only version of the feature renderer for non-editor views:

| Feature | Description |
|---------|-------------|
| Mode-aware filtering | Only shows features where the mode's visibility flag is true |
| No editing support | No click handlers, no drawing preview, no geometry editing |
| Shared across views | Runs in SharedMapContainer, persists across navigation |

### File 3: Update `src/components/layout/SharedMapContainer.tsx`

Integrate the shared feature rendering:

| Change | Description |
|--------|-------------|
| Get map instance | Add state to capture map ref when loaded |
| Use FeatureContext | Get features from the shared context |
| Use useSharedFeatureRenderer | Render features with mode filtering |

### File 4: Update `src/pages/TrackEditor.tsx`

Modify to work with the shared feature context:

| Change | Description |
|--------|-------------|
| Use FeatureContext | Get features from context instead of local hook |
| Keep editor-only rendering | Still use `useFeatureRenderer` for editing overlays (selection highlight, drawing preview) |
| Handle layer conflicts | Disable shared renderer when editor-specific layers are active |

### File 5: Update `src/components/layout/AppLayout.tsx`

Wrap the app with FeatureProvider:

| Change | Description |
|--------|-------------|
| Add FeatureProvider | Wrap content so features are available everywhere |

---

## Mode-Aware Visibility Logic

When filtering features for display:

| Mode | Filter Logic |
|------|-------------|
| `editor` | Show all features (editor sees everything) |
| `fan` | Show features where `visibleToFans === true` |
| `media` | Show features where `visibleToMedia === true` |
| `ops` | Show features where `visibleToOps === true` |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/FeatureContext.tsx` | Shared feature state and loading |
| `src/hooks/useSharedFeatureRenderer.ts` | Read-only feature rendering for non-editor views |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/SharedMapContainer.tsx` | Add shared feature rendering |
| `src/components/layout/AppLayout.tsx` | Add FeatureProvider wrapper |
| `src/pages/TrackEditor.tsx` | Use shared context, handle layer coordination |

---

## Result

After this change:

1. Features created in Track Editor will appear in all other views
2. Visibility toggles (Fans/Media/Ops) in the Feature Inspector will control which views show each feature
3. Only published features should optionally be shown (if desired), or all features shown in editor mode
4. The editor retains full editing capabilities (drawing, selection, geometry editing)
