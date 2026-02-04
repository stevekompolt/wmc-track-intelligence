
# Fix Geometry Editing Preview and Add Feature Visibility Toggles

## Issues Identified

### Issue 1: Geometry disappears when clicking "Edit Geometry"

**Root Cause:** The `useFeatureGeometryEditor` hook has a dependency issue in the `useEffect` that creates the editing layers. It uses `feature?.id` as a dependency instead of `feature`, which means when the feature reference changes (but ID stays the same), the layers are not recreated with the updated feature data.

Additionally, the layers are being removed and re-added on every effect run, but the `addEditingLayers` function checks `editingLayersAddedRef.current` and returns early if it's already true - but this ref is reset in `removeEditingLayers`, creating a race condition.

**Fix:** Modify the effect to properly handle layer creation by:
- Using the feature object more carefully in dependencies
- Ensuring the layers are created after checking map style is loaded
- Adding a small delay or ensuring proper sequencing

### Issue 2: Feature List needs visibility toggle per feature

**User Request:** Add an "eye" toggle icon to each feature row that allows hiding/showing individual features on the map. This is local UI visibility, separate from the persisted `visibleToFans/Media/Ops` fields.

---

## Technical Changes

### File 1: `src/hooks/useFeatureGeometryEditor.ts`

**Problem:** The effect clears and recreates layers, but the `addEditingLayers` callback is memoized with `feature` as a dependency. When the effect runs, it calls `removeEditingLayers()` which sets `editingLayersAddedRef.current = false`, then immediately calls `addEditingLayers()`. However, if the map style isn't loaded or there's an async issue, the layers may not be added.

| Change | Description |
|--------|-------------|
| Inline layer creation | Move layer creation logic directly into the effect to avoid stale closure issues |
| Remove early return check | Don't check `editingLayersAddedRef.current` before adding layers since we just removed them |
| Ensure synchronous execution | Create layers immediately after removing them when style is loaded |

### File 2: `src/components/editor/FeatureList.tsx`

Add a visibility toggle (eye icon) to each feature row:

| Change | Description |
|--------|-------------|
| Add `hiddenFeatureIds` prop | Set of feature IDs that are hidden on the map |
| Add `onToggleVisibility` prop | Callback to toggle a feature's visibility |
| Add Eye/EyeOff icon button | Toggle button in each feature row |

### File 3: `src/components/editor/CollapsibleFeatureList.tsx`

Pass through the new visibility props:

| Change | Description |
|--------|-------------|
| Add `hiddenFeatureIds` prop | Pass through to FeatureList |
| Add `onToggleVisibility` prop | Pass through to FeatureList |

### File 4: `src/pages/TrackEditor.tsx`

Manage hidden features state and pass to renderer:

| Change | Description |
|--------|-------------|
| Add `hiddenFeatureIds` state | `useState<Set<string>>(new Set())` |
| Add toggle handler | Function to add/remove IDs from the set |
| Filter features for renderer | Exclude hidden features from rendering |
| Pass props to CollapsibleFeatureList | Connect UI to state |

### File 5: `src/hooks/useFeatureRenderer.ts`

Optionally receive hidden feature IDs to filter during rendering:

| Change | Description |
|--------|-------------|
| Add `hiddenFeatureIds` prop | Set of IDs to exclude from rendering |
| Filter in `toGeoJSON` | Exclude hidden features from the rendered collection |

---

## Visual Result

**Before:**
- Geometry disappears when entering edit mode
- No way to hide individual features from the map

**After:**
- Geometry remains visible with correct styling during editing
- Each feature row has an eye icon toggle to show/hide it on the map
- Hidden features have a muted appearance in the list

---

## UI Design for Visibility Toggle

```
[icon] Feature Name               [eye] draft
```

- Eye icon on right side (before status badge)
- Filled eye = visible
- Eye with slash = hidden
- Clicking toggles local visibility
- Hidden features show with reduced opacity in the list

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useFeatureGeometryEditor.ts` | Fix layer creation timing/sequencing |
| `src/components/editor/FeatureList.tsx` | Add visibility toggle icon |
| `src/components/editor/CollapsibleFeatureList.tsx` | Pass visibility props |
| `src/pages/TrackEditor.tsx` | Add hidden features state and handlers |
| `src/hooks/useFeatureRenderer.ts` | Filter hidden features from rendering |
