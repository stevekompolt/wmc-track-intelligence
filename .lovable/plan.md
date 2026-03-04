

# Fix: Image Overlays Not Rendering on Map

## Problem
The overlay corner markers appear correctly, confirming valid bounding boxes. However, the actual overlay image is not rendering on the map. The most likely cause is that the `imageUrl` (a base64 data URL) was lost due to localStorage quota limits. The `overlaysApi.ts` save fallback (lines 98-107) doesn't actually strip data URLs — the "compact" save is identical to the original, so the save still fails silently and on reload the image data is gone.

## Root Cause
When large base64 images are stored via `updateOverlay`, the `saveOverlays` call can exceed the ~5MB localStorage quota. The fallback at line 102 creates a "compact" copy but doesn't actually remove the large data URLs, so the retry also fails. On next page load, the overlay object has no `imageUrl`, so nothing renders — but the bounding box is intact, so markers still work.

## Fix Plan

### 1. Add diagnostic logging to `useMultiOverlayRenderer`
Add a `console.warn` when an overlay has valid bounds but empty/missing `imageUrl`, so missing images are immediately obvious during development.

### 2. Fix the localStorage fallback in `overlaysApi.ts`
In the `updateOverlay` function, when the initial `saveOverlays` fails, the fallback should actually strip large data URLs (e.g., replace base64 strings longer than 10KB with empty string) and warn the user that images won't persist across reloads. This prevents silent data loss.

### 3. Add visual indicator in overlay list for missing images
In the `MapItemList` or `OverlayEditorPanel`, show a warning badge/icon when an overlay's `imageUrl` is empty, prompting the user to re-upload.

### Files to Edit
- `src/services/overlaysApi.ts` — fix the fallback save to actually strip large data URLs and log a warning
- `src/hooks/useMultiOverlayRenderer.ts` — add diagnostic logging for overlays with bounds but no image
- `src/components/editor/OverlayEditorPanel.tsx` — add a "no image" warning indicator

