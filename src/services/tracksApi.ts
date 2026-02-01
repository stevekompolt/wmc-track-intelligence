import { Track } from '@/types/track';

const TRACKS_API_URL = 'https://api.realintelligence.com/api/specific-property-list.py?orgId=00D5e000000HEcP&sandbox=False';

// Patterns to extract data from XML-style tags
const NAME_PATTERN = /<name>([^<]+)<\/name>/gi;
const ID_PATTERN = /<id>([^<]+)<\/id>/gi;
const COORDINATES_PATTERN = /<coordinates>([^<]+)<\/coordinates>/gi;

/**
 * Parse coordinates string "lat,lng,zoom" into numeric values
 */
function parseCoordinates(coordString: string): { latitude?: number; longitude?: number; zoom?: number } {
  const parts = coordString.split(',').map(p => parseFloat(p.trim()));
  
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return {
      latitude: parts[0],
      longitude: parts[1],
      zoom: parts.length >= 3 && !isNaN(parts[2]) && parts[2] > 0 ? parts[2] : undefined,
    };
  }
  
  return {};
}

/**
 * Parse the XML-style response from the SFDC property list API
 * Each track record contains <name>, <id>, and optional <coordinates> tags
 */
function parseTracksResponse(responseText: string): Track[] {
  const tracks: Track[] = [];
  
  // Extract all names, IDs, and coordinates
  const names = [...responseText.matchAll(NAME_PATTERN)].map(m => m[1].trim());
  const ids = [...responseText.matchAll(ID_PATTERN)].map(m => m[1].trim());
  const coordinates = [...responseText.matchAll(COORDINATES_PATTERN)].map(m => m[1].trim());
  
  // Pair them up - assuming they appear in order
  const count = Math.min(names.length, ids.length);
  
  for (let i = 0; i < count; i++) {
    if (names[i] && ids[i]) {
      const coords = coordinates[i] ? parseCoordinates(coordinates[i]) : {};
      tracks.push({
        id: ids[i],
        name: names[i],
        ...coords,
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
