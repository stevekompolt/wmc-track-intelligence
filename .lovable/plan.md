
# Track Coordinate Integration

## Overview
Update the track parsing and map component to read coordinates from the API and automatically center the map when a track is selected.

---

## API Data Format

The coordinates tag format from SFDC:
```xml
<coordinates>40.580477,-112.380066,0</coordinates>
```

Values:
- **latitude**: 40.580477
- **longitude**: -112.380066  
- **zoom/elevation**: 0 (we can use this as zoom level or ignore if 0)

---

## Implementation Changes

### 1. Update Track Type
**`src/types/track.ts`**

Add coordinate fields to the Track interface:
- `latitude?: number`
- `longitude?: number`
- `zoom?: number`

### 2. Update API Parser
**`src/services/tracksApi.ts`**

Add parsing for the coordinates tag:
- Extract using pattern: `/<coordinates>([^<]+)<\/coordinates>/gi`
- Split the value by comma to get lat, lng, zoom
- Pair with corresponding track records

### 3. Update TrackMap Component
**`src/components/editor/TrackMap.tsx`**

- Accept `latitude`, `longitude`, and optional `zoom` as props
- When props change, fly the map to the new location using `map.flyTo()`
- Use smooth animation for a polished experience
- Fall back to default Utah coordinates if none provided

### 4. Update TrackEditor Page
**`src/pages/TrackEditor.tsx`**

- Pass coordinate props from selectedTrack to TrackMap component

---

## Technical Details

### Coordinate Parsing Logic
```text
1. Match all <coordinates> tags in response
2. For each match, split by comma: "40.58,-112.38,0" → [40.58, -112.38, 0]
3. Parse as floats: latitude, longitude, zoom
4. Associate with corresponding track by index order
```

### Map Animation
When track changes, use Mapbox's `flyTo` method:
- Duration: ~2 seconds
- Zoom: Use value from coordinates, or default to 14
- Smooth easing curve

---

## Files Changed

| File | Action |
|------|--------|
| `src/types/track.ts` | Modify - Add lat/lng/zoom fields |
| `src/services/tracksApi.ts` | Modify - Parse coordinates tag |
| `src/components/editor/TrackMap.tsx` | Modify - Accept coords, add flyTo |
| `src/pages/TrackEditor.tsx` | Modify - Pass coords to TrackMap |

---

## Future: Saving Coordinates

Once reading works, we can add a "Save Location" button that:
1. Captures current map center and zoom
2. POSTs to an SFDC update endpoint
3. Updates the coordinates field on the Property record

This would require a write endpoint on the Real Intelligence API.
