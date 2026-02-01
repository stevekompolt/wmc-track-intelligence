
# Remember Last Viewed Track

## Overview
Persist the user's last selected track so it automatically loads when they return to the Track Editor, even after logging out and back in.

---

## Approach

Use **localStorage** to save the selected track ID. When the Track Editor mounts:
1. Check localStorage for a saved track ID
2. Once tracks are loaded from the API, find and select the matching track
3. Whenever the user selects a different track, update localStorage

Using localStorage (vs sessionStorage) ensures the preference persists across browser sessions and logouts.

---

## Implementation

### Changes to TrackEditor.tsx

1. **Add storage key constant**: `wmc_last_track_id`

2. **Initialize from localStorage**: On mount, read the saved track ID

3. **Auto-select saved track**: Once tracks load via `useTracks()`, find and select the matching track

4. **Save on selection change**: When user selects a new track, save its ID to localStorage

---

## Technical Details

### Storage Logic
```text
On Mount:
1. Read savedTrackId from localStorage

On Tracks Load:
2. If savedTrackId exists AND tracks are loaded
3. Find track where track.id === savedTrackId
4. If found, call setSelectedTrack(track)

On Track Selection:
5. Save selectedTrack.id to localStorage
6. (Or remove from localStorage if null)
```

### Hook Integration
The `useTracks()` hook returns `{ data: tracks, isLoading }`. We'll use a `useEffect` to auto-select once:
- Tracks have loaded
- We have a saved track ID
- No track is currently selected (avoid overwriting manual selection)

---

## Files Changed

| File | Action |
|------|--------|
| `src/pages/TrackEditor.tsx` | Add localStorage read/write for track persistence |

---

## User Experience

- User selects "Utah Motorsports Campus"
- User logs out and closes browser
- User returns next day, logs in, goes to Track Editor
- Map automatically loads Utah Motorsports Campus
