

# Sync Audio + Cesium Story Start

## Problem
Currently the iframe with `&play=1` loads and starts playing immediately in the background, even before the user clicks "Start Experience". The audio and slideshow are out of sync.

## Approach
Don't render the iframe until the user clicks "Start Experience". When clicked, start the audio AND set the iframe src dynamically. This ensures both begin at the same moment.

## Changes

### `src/pages/Utah2026.tsx`
- Only render the iframe when `started` is `true`.
- Before `started`, show a placeholder (black background) behind the overlay.
- In `handleStart`: set `started = true`, play audio. The iframe mounts with `&play=1` at that moment, so both start together.

```tsx
// Before started: no iframe, just black bg
// After started: iframe renders with &play=1

const handleStart = () => {
  setStarted(true);
  setIsPlaying(true);
  audioRef.current?.play().catch(console.error);
};

// In JSX:
{started && (
  <iframe
    src="https://ion.cesium.com/stories/viewer/?id=...&play=1"
    ...
  />
)}
```

No new dependencies. Single file change.

