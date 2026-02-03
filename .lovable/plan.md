

# Fan Preview Panel Implementation Plan

## Overview

Create a cinematic, passive fan experience panel that allows users to take an automated camera tour through the venue. The panel emphasizes the map as the primary visual while providing elegant controls for tour playback, scene navigation, and viewpoint selection.

---

## Architecture

```text
+------------------------------------------------------------------+
|  Top Nav Bar                                                      |
+------------------------------------------------------------------+
|                                               |                   |
|                                               |   FAN PREVIEW     |
|                                               |   [Venue Name]    |
|                                               |                   |
|                                               |   [▶ Play Tour]   |
|                                               |   60s • 6 scenes  |
|                MAP CANVAS                     |                   |
|                (full bleed)                   |   ○ ○ ● ○ ○ ○     |
|                                               |                   |
|                                               |   CURRENT SCENE   |
|                                               |   Description...  |
|                                               |                   |
|                                               |   [Viewpoints]    |
|                                               |                   |
|                                               |   Day/Night | VIP |
|                                               |                   |
|                                               |   [🎟 Tickets]    |
|                                               |   ← Exit          |
+------------------------------------------------------------------+
```

---

## New Files

### 1. Types: `src/types/tour.ts`

Define tour-specific data structures:

| Type | Purpose |
|------|---------|
| `TourScene` | Single scene in the tour with viewpoint ref, duration, description |
| `TourState` | Current tour playback state (playing, paused, completed) |
| `TourConfig` | Tour configuration (scenes, total duration) |

```text
TourScene {
  id: string
  viewpointId: string
  name: string
  description: string
  duration: number (seconds)
  thumbnailUrl?: string
}

TourState = 'idle' | 'playing' | 'paused' | 'completed'
```

---

### 2. Hook: `src/hooks/useCinematicTour.ts`

Custom hook to manage tour playback:

| Function | Purpose |
|----------|---------|
| `play()` | Start/resume tour |
| `pause()` | Pause tour |
| `replay()` | Restart from beginning |
| `jumpToScene(index)` | Jump to specific scene |
| `currentSceneIndex` | Active scene index |
| `tourState` | Current playback state |
| `progress` | Overall tour progress (0-1) |

Tour logic:
- Uses existing viewpoints filtered by `visibleToFans: true`
- Each scene triggers `setActiveViewpoint()` for camera flyTo
- Auto-advances using `setTimeout` based on scene duration
- Pauses correctly when user interacts

---

### 3. Panel Component: `src/components/fan/FanPreviewPanel.tsx`

Main panel component with all sections:

**Structure:**
- Header (static)
- Primary Action Button
- Scene Timeline (dot navigation)
- Current Scene Card
- Viewpoint Selector (when paused)
- Experience Toggles
- Footer CTA
- Exit Link

**Props:**
- None (uses context for data)

**State:**
- `tourState` from `useCinematicTour`
- `experienceMode: 'day' | 'night'`
- `vipEmphasis: boolean`

---

### 4. Sub-components

**`src/components/fan/TourPlayButton.tsx`**
- Large primary button with state-based label
- Variants: Play, Pause, Replay
- Subtle glow on hover
- Duration/scene count subtext

**`src/components/fan/SceneTimeline.tsx`**
- Horizontal row of dots
- Active dot highlighted with primary color
- Clickable for scene jumping
- Tooltip showing scene name on hover

**`src/components/fan/SceneCard.tsx`**
- Current scene title (uppercase, bold)
- 1-2 line description
- Optional thumbnail (right-aligned)
- Fade transition between scenes

**`src/components/fan/FanViewpointList.tsx`**
- Vertical list of viewpoints (visible when paused)
- Each item: icon + label
- Active viewpoint highlighted
- Click triggers camera flyTo

**`src/components/fan/ExperienceToggles.tsx`**
- Two compact toggles:
  - Day / Night
  - Standard / VIP emphasis
- Minimal styling

**`src/components/fan/FanFooterCTA.tsx`**
- Primary button: "View Tickets"
- Secondary text link: "Explore VIP Experiences"
- Subtle top divider

---

### 5. Mobile Drawer: `src/components/fan/FanPreviewDrawer.tsx`

Bottom drawer for tablet/mobile:
- Uses existing `Drawer` component from vaul
- Collapsed state shows play button only
- Expanded state shows timeline + scene card
- Swipe dots for scene navigation

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/tour.ts` | Create | Tour data types |
| `src/hooks/useCinematicTour.ts` | Create | Tour playback logic |
| `src/components/fan/FanPreviewPanel.tsx` | Create | Main panel component |
| `src/components/fan/TourPlayButton.tsx` | Create | Play/Pause/Replay button |
| `src/components/fan/SceneTimeline.tsx` | Create | Dot navigation |
| `src/components/fan/SceneCard.tsx` | Create | Current scene display |
| `src/components/fan/FanViewpointList.tsx` | Create | Viewpoint list (paused state) |
| `src/components/fan/ExperienceToggles.tsx` | Create | Day/Night, VIP toggles |
| `src/components/fan/FanFooterCTA.tsx` | Create | Ticket CTA |
| `src/components/fan/FanPreviewDrawer.tsx` | Create | Mobile drawer |
| `src/pages/FanExperience.tsx` | Modify | Replace current panel with FanPreviewPanel |
| `src/index.css` | Modify | Add cinematic animation keyframes |

---

## Styling Details

### Panel Styling

| Property | Value |
|----------|-------|
| Width | 340px (desktop) |
| Height | 100vh |
| Position | absolute top-0 right-0 bottom-0 |
| Background | rgba(12, 14, 18, 0.85) |
| Border | 1px left border-border |
| z-index | 10 |
| Pointer events | auto |

### Typography

| Element | Style |
|---------|-------|
| Header title | font-display, tracking-wider, text-sm, uppercase |
| Venue name | text-xs, text-muted-foreground |
| Scene title | uppercase, font-semibold, text-base |
| Description | text-sm, text-muted-foreground |
| Button labels | font-display, tracking-wide |

### Colors

| Element | Color |
|---------|-------|
| Active states | hsl(var(--primary)) (brand red) |
| Inactive dots | hsl(var(--muted-foreground)) |
| Background | rgb(12, 14, 18) at 85% opacity |
| Text | foreground / muted-foreground |

### Animations

Add to `tailwind.config.ts`:

| Animation | Purpose |
|-----------|---------|
| `fade-scene` | Smooth scene card transitions (0.5s) |
| `pulse-subtle` | Gentle play button breathing |

---

## Integration Points

### ViewpointContext Integration

The panel uses the existing `ViewpointContext`:
- `filteredViewpoints` - Filter by `visibleToFans: true`
- `setActiveViewpoint()` - Trigger camera flyTo
- `activeViewpoint` - Highlight current viewpoint

### TrackContext Integration

- `selectedTrack.name` - Display venue name in header

### useIsMobile Hook

- Detect viewport size
- Switch between Panel (desktop) and Drawer (mobile)

---

## Runtime Behavior

1. **User enters /fan route**
   - Panel renders with idle state
   - Play button shows "▶ Play Cinematic Tour"
   - Scene timeline shows first dot active

2. **User clicks Play**
   - Tour begins, button changes to "⏸ Pause Tour"
   - Camera flies to first viewpoint
   - Scene card shows scene 1 info
   - After scene duration, auto-advance to next

3. **User clicks Pause**
   - Tour pauses, button changes to "▶ Resume Tour"
   - Viewpoint list appears
   - User can manually select viewpoints

4. **Tour completes**
   - Button changes to "↻ Replay Tour"
   - Viewpoint list appears

5. **User clicks scene dot**
   - Tour jumps to that scene
   - Camera flies to scene viewpoint

6. **User clicks Exit**
   - Navigate to /editor (or previous mode)

---

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Full 340px right panel |
| Tablet (768-1024px) | Narrower panel (280px) or bottom drawer |
| Mobile (<768px) | Bottom drawer only |

Mobile drawer features:
- Collapsed: Small play button visible
- Expanded: Timeline, scene card, CTA
- Swipe left/right on dots for scene navigation

---

## Mock Tour Data

Tour scenes derived from fan-visible viewpoints:

| Scene | Name | Duration |
|-------|------|----------|
| 1 | Start/Finish Line | 10s |
| 2 | Turn 1 Entry | 10s |
| 3 | Pit Lane Overview | 10s |
| 4 | Aerial View | 10s |
| 5 | Grandstand View | 10s |
| 6 | Victory Lane | 10s |

Total: 60 seconds, 6 scenes

---

## Design Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Panel overlays map | absolute positioning, no resize |
| Map is primary | Panel is translucent, minimal chrome |
| No scrollbars | Fixed height, no overflow |
| Dark translucent background | rgba(12, 14, 18, 0.85) |
| Brand red accents only | Primary color for active states |
| Cinematic transitions | fade-scene animation |
| One primary action | Play button dominates |
| No technical controls | Day/Night, VIP only |
| Mobile drawer | Drawer component on small screens |

---

## Implementation Order

| Step | Task |
|------|------|
| 1 | Create tour types (`src/types/tour.ts`) |
| 2 | Create `useCinematicTour` hook |
| 3 | Create `TourPlayButton` component |
| 4 | Create `SceneTimeline` component |
| 5 | Create `SceneCard` component |
| 6 | Create `FanViewpointList` component |
| 7 | Create `ExperienceToggles` component |
| 8 | Create `FanFooterCTA` component |
| 9 | Create `FanPreviewPanel` (desktop) |
| 10 | Create `FanPreviewDrawer` (mobile) |
| 11 | Update `FanExperience.tsx` page |
| 12 | Add fade-scene animation to CSS |
| 13 | Test end-to-end playback |

