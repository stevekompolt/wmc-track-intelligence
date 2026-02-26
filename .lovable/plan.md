

# Sync Cesium Slideshow + Voiceover with ?play

## Problem
The Cesium iframe and voiceover audio require separate user interactions. We want a single "Start Experience" click to begin both simultaneously.

## Approach
Don't render the iframe until the user clicks "Start Experience". On click, start the audio **and** inject the iframe with `?play` appended to the URL, so Cesium auto-starts the slideshow. This guarantees both begin at the same moment.

## Changes

### `src/pages/Utah2026.tsx`

1. **Defer iframe rendering** — only render the `<iframe>` when `started === true`.
2. **Use `?play` in the iframe URL** — append `&play` to the Cesium story URL so it auto-starts the slideshow on load.
3. **`handleStart`** — sets `started = true`, plays audio. The iframe mounts for the first time with `?play`, so both start together.

#### Before (simplified):
```tsx
// iframe always rendered
<iframe src="https://ion.cesium.com/stories/viewer/?id=3b83c565-...&play" ... />
```

#### After:
```tsx
const CESIUM_URL = "https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1&play";

// Only mount iframe after Start is clicked
{started && (
  <iframe src={CESIUM_URL} ... />
)}
```

No new dependencies. No new files.

