

# Auto-Start Cesium Story on Load

## Change

### `src/pages/Utah2026.tsx`
- Append `&play=1` to the Cesium iframe `src` URL so the story begins automatically when the iframe loads.
- Change from: `https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1`
- Change to: `https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1&play=1`

This eliminates the need for the user to manually click Cesium's play button after dismissing the "Start Experience" overlay.

