// Image analysis utilities for track surface detection
import mapboxgl from 'mapbox-gl';

export interface DetectionThresholds {
  maxLightness: number;      // Max lightness for asphalt (0-100, default 35)
  maxSaturation: number;     // Max saturation for gray detection (0-100, default 20)
  minAreaPixels: number;     // Minimum contiguous pixel area to include
  simplificationTolerance: number; // Douglas-Peucker simplification tolerance in pixels
}

export const DEFAULT_THRESHOLDS: DetectionThresholds = {
  maxLightness: 35,
  maxSaturation: 20,
  minAreaPixels: 500,
  simplificationTolerance: 3,
};

/**
 * Capture the current map canvas as ImageData
 */
export function captureMapCanvas(map: mapboxgl.Map): ImageData {
  const canvas = map.getCanvas();
  const width = canvas.width;
  const height = canvas.height;
  
  // Create offscreen canvas to get pixel data
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d')!;
  
  // Draw the map canvas onto our offscreen canvas
  ctx.drawImage(canvas, 0, 0);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

/**
 * Classify pixels as asphalt or not based on HSL thresholds
 * Returns a 2D boolean array
 */
export function classifyAsphaltPixels(
  imageData: ImageData,
  thresholds: DetectionThresholds
): boolean[][] {
  const { width, height, data } = imageData;
  const result: boolean[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const [, saturation, lightness] = rgbToHsl(r, g, b);
      
      // Asphalt: low saturation (gray) AND low lightness (dark)
      const isAsphalt = saturation <= thresholds.maxSaturation && 
                        lightness <= thresholds.maxLightness;
      
      row.push(isAsphalt);
    }
    result.push(row);
  }
  
  return result;
}

/**
 * Flood fill to find connected regions and filter by minimum area
 */
function filterSmallRegions(mask: boolean[][], minArea: number): boolean[][] {
  const height = mask.length;
  const width = mask[0]?.length || 0;
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const result: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] && !visited[y][x]) {
        // Flood fill to find region
        const region: [number, number][] = [];
        const stack: [number, number][] = [[x, y]];
        
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
          if (visited[cy][cx] || !mask[cy][cx]) continue;
          
          visited[cy][cx] = true;
          region.push([cx, cy]);
          
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        
        // Keep region if large enough
        if (region.length >= minArea) {
          for (const [rx, ry] of region) {
            result[ry][rx] = true;
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Trace the outer contour of a binary mask using a simple boundary following algorithm
 * Returns an array of [x, y] pixel coordinates
 */
export function traceContour(mask: boolean[][]): [number, number][] {
  const height = mask.length;
  const width = mask[0]?.length || 0;
  
  if (height === 0 || width === 0) return [];
  
  // Find starting point (first true pixel from top-left)
  let startX = -1;
  let startY = -1;
  
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  
  if (startX === -1) return [];
  
  // 8-directional boundary tracing
  const directions = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1]
  ];
  
  const contour: [number, number][] = [];
  let x = startX;
  let y = startY;
  let dir = 0; // Start going right
  
  const isValid = (px: number, py: number): boolean => {
    return px >= 0 && px < width && py >= 0 && py < height && mask[py][px];
  };
  
  const maxIterations = width * height * 2;
  let iterations = 0;
  
  do {
    contour.push([x, y]);
    
    // Find next boundary pixel
    let found = false;
    const startDir = (dir + 5) % 8; // Start from dir - 3 (counter-clockwise)
    
    for (let i = 0; i < 8; i++) {
      const checkDir = (startDir + i) % 8;
      const [dx, dy] = directions[checkDir];
      const nx = x + dx;
      const ny = y + dy;
      
      if (isValid(nx, ny)) {
        x = nx;
        y = ny;
        dir = checkDir;
        found = true;
        break;
      }
    }
    
    if (!found) break;
    iterations++;
  } while ((x !== startX || y !== startY) && iterations < maxIterations);
  
  return contour;
}

/**
 * Douglas-Peucker line simplification algorithm
 */
export function simplifyPolygon(
  coords: [number, number][],
  tolerance: number
): [number, number][] {
  if (coords.length <= 2) return coords;
  
  // Find the point with maximum distance from the line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  
  const [x1, y1] = coords[0];
  const [x2, y2] = coords[coords.length - 1];
  
  for (let i = 1; i < coords.length - 1; i++) {
    const [x, y] = coords[i];
    
    // Distance from point to line
    const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    const dist = den > 0 ? num / den : 0;
    
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPolygon(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPolygon(coords.slice(maxIdx), tolerance);
    
    return [...left.slice(0, -1), ...right];
  }
  
  return [coords[0], coords[coords.length - 1]];
}

/**
 * Convert pixel coordinates to geographic coordinates
 */
export function pixelsToGeoCoords(
  pixels: [number, number][],
  map: mapboxgl.Map
): [number, number][] {
  return pixels.map(([x, y]) => {
    const lngLat = map.unproject([x, y]);
    return [lngLat.lng, lngLat.lat];
  });
}

/**
 * Main detection function - runs the full pipeline
 */
export function detectAsphaltPolygon(
  map: mapboxgl.Map,
  thresholds: DetectionThresholds = DEFAULT_THRESHOLDS
): [number, number][][] | null {
  // 1. Capture canvas
  const imageData = captureMapCanvas(map);
  
  // 2. Classify pixels
  let mask = classifyAsphaltPixels(imageData, thresholds);
  
  // 3. Filter small regions
  mask = filterSmallRegions(mask, thresholds.minAreaPixels);
  
  // 4. Trace contour
  const contourPixels = traceContour(mask);
  
  if (contourPixels.length < 3) {
    return null;
  }
  
  // 5. Simplify
  const simplifiedPixels = simplifyPolygon(contourPixels, thresholds.simplificationTolerance);
  
  if (simplifiedPixels.length < 3) {
    return null;
  }
  
  // 6. Convert to geographic coordinates
  const geoCoords = pixelsToGeoCoords(simplifiedPixels, map);
  
  // Close the polygon
  if (geoCoords.length > 0) {
    geoCoords.push(geoCoords[0]);
  }
  
  // Return as polygon coordinate rings (outer ring only)
  return [geoCoords];
}

/**
 * Create a preview overlay of detected pixels on the map
 */
export function createDetectionPreview(
  map: mapboxgl.Map,
  thresholds: DetectionThresholds
): { cleanup: () => void; detectedCoords: [number, number][][] | null } {
  const sourceId = 'asphalt-detection-preview';
  const fillLayerId = 'asphalt-detection-fill';
  const strokeLayerId = 'asphalt-detection-stroke';
  
  // Run detection
  const polygonRings = detectAsphaltPolygon(map, thresholds);
  
  // Cleanup function
  const cleanup = () => {
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };
  
  if (!polygonRings || polygonRings[0].length < 4) {
    return { cleanup, detectedCoords: null };
  }
  
  // Add preview layers
  cleanup(); // Remove any existing preview
  
  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: polygonRings,
      },
    },
  });
  
  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': '#3B82F6',
      'fill-opacity': 0.3,
    },
  });
  
  map.addLayer({
    id: strokeLayerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': '#3B82F6',
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  });
  
  return { cleanup, detectedCoords: polygonRings };
}
