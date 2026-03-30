
Goal: fix two linked regressions in `/editor`:
1) overlay drag/corner edits resetting after ~10–20px, and
2) deleted overlays/features disappearing from list but still visible on map.

What I found
- `useMultiOverlayRenderer.createMarkers` still depends on `overlays`, so every drag tick (state update) recreates markers and breaks the drag gesture.
- `TrackEditor` drag callbacks depend on the full `overlayContext` object, so callbacks churn on each render and can retrigger marker setup.
- In `useMultiOverlayRenderer`, when `isDraggingRef.current === true`, the sync effect returns early and skips delete/hidden cleanup, so removed overlays can remain rendered.
- Renderer cleanup relies heavily on `renderedOverlayIdsRef`; if it desyncs from actual map layers/sources, stale layers can remain.

Implementation plan

1) Stabilize overlay drag lifecycle (`src/hooks/useMultiOverlayRenderer.ts`)
- Add `overlaysRef` (and keep it updated in an effect).
- Make `createMarkers` read from `overlaysRef.current` and remove `overlays` from its dependency list.
- Keep marker recreation limited to: `map`, `editingOverlayId`, `dragMode`, lock/image validity changes.
- Ensure drag session always resets cleanly (`isDraggingRef=false`) when selection changes, marker set is rebuilt, or overlay is removed.

2) Prevent callback churn from breaking marker state (`src/pages/TrackEditor.tsx`)
- Replace direct `overlayContext` usage inside drag handlers with refs for:
  - current selected overlay
  - `updateOverlayLocal`
  - `commitOverlay`
- Keep `handleCornerDrag`, `handleMoveDrag`, `handleDragEnd` stable (minimal dependencies).
- Reset overlay drag mode when selected overlay is cleared/deleted.

3) Always reconcile map layers even during drag (`src/hooks/useMultiOverlayRenderer.ts`)
- Split sync responsibilities:
  - Structural reconciliation (add/remove/hide/unhide) always runs.
  - Fast coordinate updates run during active drag (`setCoordinates` path).
- Remove the “return early” behavior that skips delete cleanup while dragging.
- Add orphan cleanup by scanning map style IDs with renderer prefixes (`overlay-layer-`, `overlay-image-`) and removing anything no longer present in current overlay state.

4) Harden feature/overlay visual removal updates
- `src/hooks/useFeatureRenderer.ts`: after `source.setData(...)`, trigger repaint to force immediate visual removal.
- `src/hooks/useSharedFeatureRenderer.ts`: same immediate repaint behavior for shared source updates; ensure editor mode aggressively hides/removes shared overlay layers so editor view never shows stale shared layers.

5) Small state hygiene on delete (`src/pages/TrackEditor.tsx`)
- When deleting a feature, also remove its id from `hiddenFeatureIds` to avoid stale hidden-state residue.
- Ensure delete flow clears selection + edit states before/while async delete resolves.

Validation plan (end-to-end)
- Add image overlay → enable Corners → drag continuously across large distance (no reset).
- Add image overlay → Move mode → continuous drag for several seconds (no jitter/reset).
- Delete selected overlay during/after drag → layer disappears immediately from map and list.
- Delete line feature and polygon feature → both disappear immediately from map and list.
- Repeat after map style switch and after creating 3+ overlays to confirm no orphan layers remain.
