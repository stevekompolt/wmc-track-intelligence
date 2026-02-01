
# Shared Track Context Across All Views

## Overview
Create a global track context so that when you select a track in Track Editor, it stays selected when you navigate to Media Intelligence, Event Ops, or Fan Preview. Each view shows the same base map with different mode-specific overlays.

---

## Current State

Each page is independent:
- Track Editor: Has TrackSelector and TrackMap with localStorage persistence
- Media Intelligence: Placeholder only, no map or track
- Event Ops: Placeholder only, no map or track
- Fan Experience: Placeholder only, no map or track

---

## Proposed Architecture

```text
                     TrackContext (global)
                           |
          +----------------+----------------+
          |                |                |
     selectedTrack    setSelectedTrack   tracks[]
          |
          v
    +-----+-----+-----+-----+
    |     |     |     |     |
 Editor  Ops  Media  Fan   (all consume same context)
    |     |     |     |
    v     v     v     v
  TrackMap (shared component)
  + mode-specific overlays
```

---

## Implementation Steps

### 1. Create TrackContext
**New file: `src/contexts/TrackContext.tsx`**

A React Context that:
- Holds the currently selected track
- Auto-loads tracks via useTracks hook
- Persists selection to localStorage (using existing `wmc_last_track_id` key)
- Auto-selects saved track on mount

### 2. Wrap App with TrackProvider
**`src/App.tsx`**

Add `<TrackProvider>` inside the ProtectedRoute so track context is available to all authenticated views.

### 3. Move TrackSelector to AppLayout
**`src/components/layout/AppLayout.tsx`**

Add the TrackSelector to the top navigation bar (next to the nav items) so it's always visible regardless of which view you're on.

### 4. Update TrackEditor
**`src/pages/TrackEditor.tsx`**

- Remove local track state and localStorage logic
- Consume track from TrackContext instead
- Keep the Feature Toolbox and Feature Inspector panels

### 5. Add TrackMap to Other Views
**`src/pages/MediaIntelligence.tsx`**
**`src/pages/EventOps.tsx`**
**`src/pages/FanExperience.tsx`**

- Replace placeholder cards with the same TrackMap component
- Each view gets the track from TrackContext
- Mode-specific panels remain (Cameras panel, Alerts panel, etc.)

---

## Technical Details

### TrackContext Interface
```text
TrackContextType:
  - selectedTrack: Track | null
  - setSelectedTrack: (track: Track | null) => void
  - tracks: Track[]
  - isLoading: boolean
```

### Shared TrackSelector Position
The track selector moves from the Track Editor's left panel to the top navigation bar, making it globally accessible. When you change tracks from any view, the map updates immediately.

### LocalStorage Persistence
The existing `wmc_last_track_id` key continues to work, but is now managed by TrackContext instead of TrackEditor directly.

---

## Files Changed

| File | Action |
|------|--------|
| `src/contexts/TrackContext.tsx` | Create - New context for global track state |
| `src/App.tsx` | Modify - Add TrackProvider |
| `src/components/layout/AppLayout.tsx` | Modify - Add TrackSelector to nav bar |
| `src/pages/TrackEditor.tsx` | Modify - Use context instead of local state |
| `src/pages/MediaIntelligence.tsx` | Modify - Add TrackMap, consume context |
| `src/pages/EventOps.tsx` | Modify - Add TrackMap, consume context |
| `src/pages/FanExperience.tsx` | Modify - Add TrackMap, consume context |

---

## User Experience

1. User logs in, goes to Track Editor
2. Selects "Utah Motorsports Campus" from the track dropdown in the nav bar
3. Map loads Utah Motorsports Campus
4. User clicks "Media Intelligence" in nav
5. Same map is shown, but now with camera positions and coverage overlays
6. User clicks "Event Ops"
7. Same map, now with zone status overlays
8. Track selection persists across views and sessions
