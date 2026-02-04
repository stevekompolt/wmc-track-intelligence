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
 * Create a buffer polygon around a line geometry
 * Uses perpendicular offset at each point for simplicity
 */
export function bufferLine(
  lineCoords: [number, number][],
  bufferMeters: number,
  map: mapboxgl.Map
): [number, number][][] {
  if (lineCoords.length < 2) return [];

  // Approximate meters per degree at the center of the line
  const centerLat = lineCoords.reduce((sum, c) => sum + c[1], 0) / lineCoords.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(centerLat * Math.PI / 180);
  
  const bufferLat = bufferMeters / metersPerDegreeLat;
  const bufferLng = bufferMeters / metersPerDegreeLng;

  // Build left and right offset polylines
  const leftOffsets: [number, number][] = [];
  const rightOffsets: [number, number][] = [];

  for (let i = 0; i < lineCoords.length; i++) {
    const [x, y] = lineCoords[i];
    
    // Calculate perpendicular direction based on segment
    let dx = 0, dy = 0;
    
    if (i === 0 && lineCoords.length > 1) {
      dx = lineCoords[1][0] - x;
      dy = lineCoords[1][1] - y;
    } else if (i === lineCoords.length - 1 && lineCoords.length > 1) {
      dx = x - lineCoords[i - 1][0];
      dy = y - lineCoords[i - 1][1];
    } else if (lineCoords.length > 1) {
      // Average of incoming and outgoing directions
      const dx1 = x - lineCoords[i - 1][0];
      const dy1 = y - lineCoords[i - 1][1];
      const dx2 = lineCoords[i + 1][0] - x;
      const dy2 = lineCoords[i + 1][1] - y;
      dx = (dx1 + dx2) / 2;
      dy = (dy1 + dy2) / 2;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      // Perpendicular unit vector (rotate 90 degrees)
      const perpX = -dy / len;
      const perpY = dx / len;
      
      leftOffsets.push([x + perpX * bufferLng, y + perpY * bufferLat]);
      rightOffsets.push([x - perpX * bufferLng, y - perpY * bufferLat]);
    } else {
      leftOffsets.push([x, y]);
      rightOffsets.push([x, y]);
    }
  }

  // Combine into closed polygon: left forward, right backward
  const polygon: [number, number][] = [
    ...leftOffsets,
    ...rightOffsets.reverse(),
    leftOffsets[0], // close the ring
  ];

  return [polygon];
}

/**
 * Apply a polygon mask to the asphalt detection
 * Only considers pixels within the boundary polygon
 */
export function applyBoundaryMask(
  mask: boolean[][],
  boundaryPixels: [number, number][],
  width: number,
  height: number
): boolean[][] {
  if (boundaryPixels.length < 3) return mask;

  // Create a boundary mask using ray casting
  const boundaryMask: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pointInPolygon(x, y, boundaryPixels)) {
        boundaryMask[y][x] = true;
      }
    }
  }

  // Combine with asphalt mask
  const result: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = mask[y][x] && boundaryMask[y][x];
    }
  }

  return result;
}

/**
 * Ray casting algorithm to test if point is inside polygon
 */
function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Main detection function with optional boundary constraint
 */
export function detectAsphaltPolygon(
  map: mapboxgl.Map,
  thresholds: DetectionThresholds = DEFAULT_THRESHOLDS,
  boundaryLineCoords?: [number, number][],
  bufferMeters?: number
): [number, number][][] | null {
  // 1. Capture canvas
  const imageData = captureMapCanvas(map);
  const { width, height } = imageData;
  
  // 2. Classify pixels
  let mask = classifyAsphaltPixels(imageData, thresholds);
  
  // 3. Apply boundary mask if provided
  if (boundaryLineCoords && boundaryLineCoords.length >= 2 && bufferMeters && bufferMeters > 0) {
    const bufferPolygon = bufferLine(boundaryLineCoords, bufferMeters, map);
    if (bufferPolygon.length > 0 && bufferPolygon[0].length >= 3) {
      // Convert geo coords to pixel coords
      const boundaryPixels = bufferPolygon[0].map(([lng, lat]) => {
        const point = map.project([lng, lat]);
        return [point.x, point.y] as [number, number];
      });
      mask = applyBoundaryMask(mask, boundaryPixels, width, height);
    }
  }
  
  // 4. Filter small regions
  mask = filterSmallRegions(mask, thresholds.minAreaPixels);
  
  // 5. Trace contour
  const contourPixels = traceContour(mask);
  
  if (contourPixels.length < 3) {
    return null;
  }
  
  // 6. Simplify
  const simplifiedPixels = simplifyPolygon(contourPixels, thresholds.simplificationTolerance);
  
  if (simplifiedPixels.length < 3) {
    return null;
  }
  
  // 7. Convert to geographic coordinates
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
  thresholds: DetectionThresholds,
  boundaryLineCoords?: [number, number][],
  bufferMeters?: number
): { cleanup: () => void; detectedCoords: [number, number][][] | null } {
  const sourceId = 'asphalt-detection-preview';
  const fillLayerId = 'asphalt-detection-fill';
  const strokeLayerId = 'asphalt-detection-stroke';
  const boundaryLayerId = 'asphalt-detection-boundary';
  
  // Run detection
  const polygonRings = detectAsphaltPolygon(map, thresholds, boundaryLineCoords, bufferMeters);
  
  // Cleanup function
  const cleanup = () => {
    if (map.getLayer(boundaryLayerId)) map.removeLayer(boundaryLayerId);
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
