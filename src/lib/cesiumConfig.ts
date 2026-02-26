import { Ion, Terrain } from 'cesium';

// Cesium Ion access token
export const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmY2E4OTgzNi01MGNmLTRiZGMtOWZiMS03NzlmMjYzNmQxMWYiLCJpZCI6Mzk0NjI1LCJpYXQiOjE3NzIwODU0NTZ9.Nv6ngdadlA1ThEqRFwStn1XZAMM0kSisF9pNRRRo6IE';

export function initCesium() {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

/** Convert Mapbox zoom (0-22) to Cesium camera height in meters */
export function zoomToHeight(zoom: number): number {
  return 591657550.5 / Math.pow(2, zoom);
}

/** Convert Cesium camera height in meters to Mapbox zoom (0-22) */
export function heightToZoom(height: number): number {
  return Math.log2(591657550.5 / height);
}

/** Convert Mapbox pitch (0-85, positive) to Cesium pitch (negative radians) */
export function mapboxPitchToCesium(pitch: number): number {
  return -pitch * (Math.PI / 180);
}

/** Convert Cesium pitch (negative radians) to Mapbox pitch (0-85, positive degrees) */
export function cesiumPitchToMapbox(pitchRad: number): number {
  return Math.abs(pitchRad * (180 / Math.PI));
}

export function degreesToRadians(deg: number): number {
  return deg * (Math.PI / 180);
}

export function radiansToDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

/** Create Cesium world terrain */
export function createWorldTerrain() {
  return Terrain.fromWorldTerrain();
}
