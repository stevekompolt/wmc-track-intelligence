

# Welcome Dialog for Utah 2026 Page

## Problem
Two separate clicks are needed: one for Cesium's slideshow and one for the audio unmute button. The audio button may also be hard to notice.

## Approach
Add a full-screen welcome overlay/dialog that appears when the page loads. When the user clicks "Start Experience", the dialog dismisses and the audio begins playing immediately. Since the Cesium iframe is cross-origin, we cannot programmatically start its slideshow -- but by removing the overlay, the iframe becomes interactive and the user can click Cesium's own play button. The audio will already be playing by then.

## Changes

### `src/pages/Utah2026.tsx`
- Add a `started` state (default `false`) that controls a full-screen overlay.
- On load, show a centered overlay with a title ("WMC Utah 2026") and a prominent "Start Experience" button.
- When clicked: set `started = true`, call `audioRef.current.play()`.
- Hide the mute/unmute toggle until `started` is true (no point showing it before audio begins).
- The overlay uses a high z-index and covers the iframe, so the user's first interaction is the Start button.

### UI Design
- Dark semi-transparent backdrop over the iframe.
- Centered card with the title, a brief subtitle ("Click to begin the narrated tour"), and a large play button.
- Uses existing `Button` component, no new dependencies.

