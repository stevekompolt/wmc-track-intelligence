import { Track } from '@/types/track';

const TRACKS_API_URL = 'https://api.realintelligence.com/api/specific-property-list.py?orgId=00D5e000000HEcP&sandbox=False';

// Salesforce ID pattern: 18-character alphanumeric starting with 'a0x'
const SFDC_ID_PATTERN = /a0x[A-Za-z0-9]{15}/g;

/**
 * Parse the custom delimited text response from the SFDC property list API
 * Each track record contains a name followed by an 18-character Salesforce ID
 */
function parseTracksResponse(responseText: string): Track[] {
  const tracks: Track[] = [];
  
  // Split by the Salesforce ID pattern to find records
  const matches = responseText.matchAll(SFDC_ID_PATTERN);
  let lastIndex = 0;
  
  for (const match of matches) {
    const id = match[0];
    const matchIndex = match.index!;
    
    // Extract text before this ID (contains the track name)
    const textBefore = responseText.substring(lastIndex, matchIndex);
    
    // Find the track name - look for the last meaningful text segment
    // Split by common delimiters and find the track name
    const segments = textBefore.split(/[|,\n\r]+/).filter(s => s.trim());
    
    // The track name is typically the first substantial text segment
    // Look for a segment that looks like a venue name (not boolean/numeric values)
    let trackName = '';
    for (const segment of segments) {
      const trimmed = segment.trim();
      // Skip boolean values, numbers, and very short strings
      if (
        trimmed.length > 3 &&
        !['true', 'false', 'True', 'False'].includes(trimmed) &&
        !/^\d+(\.\d+)?$/.test(trimmed)
      ) {
        trackName = trimmed;
        break;
      }
    }
    
    if (trackName && id) {
      tracks.push({
        id,
        name: trackName,
      });
    }
    
    lastIndex = matchIndex + id.length;
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
