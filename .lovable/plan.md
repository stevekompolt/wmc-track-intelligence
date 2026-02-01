

# Track List Integration for Track Editor

## Overview
Add a track selector to the Track Editor that fetches the list of available tracks from the SFDC property list API. When a track is selected, it will become the active context for the editor, enabling track-specific feature editing.

---

## API Integration

### Endpoint Details
- **URL**: `https://api.realintelligence.com/api/specific-property-list.py?orgId=00D5e000000HEcP&sandbox=False`
- **Method**: GET
- **Auth**: None required
- **Response Format**: Custom delimited text (not JSON)

### Response Parsing
Based on the API response pattern, each track record contains:
- Track Name (e.g., "Utah Motorsports Campus")
- Salesforce ID (e.g., "a0xDm000004qI5oIAE")
- Sponsor/Description text
- Boolean and numeric metadata fields

A parser will extract track name and ID from each record by identifying the 18-character Salesforce ID pattern (`a0x[A-Za-z0-9]{15}`).

---

## New Files to Create

### 1. Track Type Definitions
**`src/types/track.ts`**
- `Track` interface with id, name, description, and metadata
- `TrackState` for managing selected track context

### 2. Tracks API Service
**`src/services/tracksApi.ts`**
- `fetchTracks()` function to call the property list endpoint
- Response parser to extract track records from custom format
- Error handling for network/parse failures

### 3. Tracks Hook
**`src/hooks/useTracks.ts`**
- React Query hook for fetching and caching tracks
- Loading and error states
- Automatic refetch on mount

### 4. Track Selector Component
**`src/components/editor/TrackSelector.tsx`**
- Dropdown/select component showing available tracks
- Current track indicator
- Loading skeleton while fetching

---

## Track Editor Modifications

### Left Panel Enhancement
The Feature Toolbox panel will be reorganized:

```text
+---------------------------+
| TRACK SELECTOR            |
| [▼ Utah Motorsports...  ] |
+---------------------------+
| FEATURE TOOLBOX           |
| Drawing tools...          |
+---------------------------+
```

### State Management
- Selected track stored in component state (for now)
- Future: Context provider for track selection across views

---

## Technical Implementation

### API Response Parsing Logic
```text
1. Split response by Salesforce ID pattern
2. Extract track name from text before ID
3. Extract ID from the 18-character match
4. Extract description from text after ID
5. Return array of Track objects
```

### Error Handling
- Network errors: Show retry option in dropdown
- Parse errors: Log warning, show available tracks only
- Empty response: Display "No tracks available" message

---

## User Experience

1. User navigates to Track Editor
2. Track list loads automatically in the selector
3. User selects a track from the dropdown
4. Editor context updates to show selected track name
5. Future: Map canvas centers on track location when available

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/types/track.ts` | Create - Track type definitions |
| `src/services/tracksApi.ts` | Create - API fetch and parser |
| `src/hooks/useTracks.ts` | Create - React Query hook |
| `src/components/editor/TrackSelector.tsx` | Create - Selector UI |
| `src/pages/TrackEditor.tsx` | Modify - Add track selector to left panel |

