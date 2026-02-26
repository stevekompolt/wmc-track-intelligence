

## Fix Audio-Cesium Sync Delay

**Problem:** Audio plays instantly on click, but the Cesium iframe takes seconds to load, causing the voiceover to be out of sync with the visuals.

**Solution:** Delay the audio until the iframe signals it has loaded, using the iframe's `onLoad` event.

### File: `src/pages/Utah2026.tsx`

1. Change `handleStart` to only set `started` (mount the iframe) but **not** play audio yet.
2. Add an `onLoad` handler to the iframe that triggers `audioRef.current.play()` and sets `isPlaying`.
3. Optionally show a "Loading..." indicator over the iframe while it loads.

### Tradeoff

The iframe `onLoad` fires when the Cesium viewer page has loaded, but the story's 3D scene may still need a moment to initialize after that. This gets the sync much closer but may not be frame-perfect. There's no cross-origin API to detect exactly when the Cesium story starts animating.

