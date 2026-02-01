import { Track } from '@/types/track';

const TRACKS_API_URL = 'https://api.realintelligence.com/api/specific-property-list.py?orgId=00D5e000000HEcP&sandbox=False';

// Pattern to extract name and id from XML-style tags
const NAME_PATTERN = /<name>([^<]+)<\/name>/gi;
const ID_PATTERN = /<id>([^<]+)<\/id>/gi;

/**
 * Parse the XML-style response from the SFDC property list API
 * Each track record contains <name> and <id> tags
 */
function parseTracksResponse(responseText: string): Track[] {
  const tracks: Track[] = [];
  
  // Extract all names and IDs
  const names = [...responseText.matchAll(NAME_PATTERN)].map(m => m[1].trim());
  const ids = [...responseText.matchAll(ID_PATTERN)].map(m => m[1].trim());
  
  // Pair them up - assuming they appear in order
  const count = Math.min(names.length, ids.length);
  
  for (let i = 0; i < count; i++) {
    if (names[i] && ids[i]) {
      tracks.push({
        id: ids[i],
        name: names[i],
      });
    }
  }
  
  return tracks;
}

/**
 * Fetch tracks from the SFDC property list API
 */
export async function fetchTracks(): Promise<Track[]> {
  const response = await fetch(TRACKS_API_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tracks: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const tracks = parseTracksResponse(text);
  
  // Sort tracks alphabetically by name
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}
