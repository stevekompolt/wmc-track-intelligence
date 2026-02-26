

## Update Cesium Story URL

**File:** `src/pages/Utah2026.tsx`

Change the `CESIUM_URL` constant from:
```
https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1&play
```
to:
```
https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1
```

Remove the `&play` suffix from the constant. The `&play` parameter will be appended dynamically when the iframe mounts (on user click), preserving the synchronized start behavior.

