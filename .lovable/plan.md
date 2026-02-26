

## Fix: Cache-busted Cesium Story URL

**File:** `src/pages/Utah2026.tsx`

Append a cache-busting timestamp to the iframe `src` so the browser always fetches the latest version of the story from Cesium Ion.

Change the iframe `src` from the static `CESIUM_URL` to `{CESIUM_URL}&t=${Date.now()}` so each session loads a fresh copy.

**Single-line change** in the iframe element's `src` attribute.

