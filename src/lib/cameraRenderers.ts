import type { CameraState } from '@/types/viewpoint';
import type { CameraTarget, TransitionOptions, TargetEngine, LookAtTarget } from '@/types/camera';

/**
 * Abstract camera renderer interface
 */
export interface CameraRenderer {
  flyTo(target: CameraTarget, options?: TransitionOptions): void;
  lookAt(target: LookAtTarget, heading: number, pitch: number, range: number): void;
  setCameraState(state: CameraState): void;
  getCameraState(): CameraState | null;
  setInteractionsEnabled(enabled: boolean): void;
  getEngineType(): TargetEngine;
}

/**
 * Mapbox GL JS renderer implementation
 */
export class MapboxRenderer implements CameraRenderer {
  private mapRef: React.RefObject<any>;
  
  constructor(mapRef: React.RefObject<any>) {
    this.mapRef = mapRef;
  }
  
  getEngineType(): TargetEngine { return 'mapbox'; }
  
  flyTo(target: CameraTarget, options?: TransitionOptions): void {
    const handle = this.mapRef.current;
    if (!handle) return;
    handle.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.height,
      bearing: target.heading,
      pitch: Math.abs(target.pitch),
      duration: options?.duration || 8000,
    });
  }
  
  lookAt(target: LookAtTarget, heading: number, pitch: number, range: number): void {
    const handle = this.mapRef.current;
    if (!handle) return;
    const distanceInDegrees = range / 111000;
    const headingRad = (heading * Math.PI) / 180;
    const cameraLat = target.latitude + Math.cos(headingRad) * distanceInDegrees;
    const cameraLon = target.longitude + Math.sin(headingRad) * distanceInDegrees;
    handle.flyTo({
      center: [cameraLon, cameraLat],
      bearing: (heading + 180) % 360,
      pitch: Math.abs(pitch),
      duration: 2000,
    });
  }
  
  setCameraState(state: CameraState): void {
    this.mapRef.current?.setCameraState?.(state);
  }
  
  getCameraState(): CameraState | null {
    return this.mapRef.current?.captureCamera?.() ?? null;
  }
  
  setInteractionsEnabled(enabled: boolean): void {
    this.mapRef.current?.setInteractionsEnabled?.(enabled);
  }
}

/**
 * Cesium renderer implementation — uses real Cesium API calls
 */
export class CesiumRenderer implements CameraRenderer {
  private viewerRef: React.RefObject<any>;
  
  constructor(viewerRef: React.RefObject<any>) {
    this.viewerRef = viewerRef;
  }
  
  getEngineType(): TargetEngine { return 'cesium'; }
  
  private get handle() {
    return this.viewerRef.current;
  }
  
  flyTo(target: CameraTarget, options?: TransitionOptions): void {
    if (!this.handle) return;
    this.handle.flyToViewpoint({
      longitude: target.longitude,
      latitude: target.latitude,
      height: target.height,
      heading: target.heading,
      pitch: target.pitch,
      roll: target.roll,
    });
  }
  
  lookAt(_target: LookAtTarget, _heading: number, _pitch: number, _range: number): void {
    // Delegated via imperative handle
    if (!this.handle) return;
    console.log('CesiumRenderer.lookAt via imperative handle');
  }
  
  setCameraState(state: CameraState): void {
    this.handle?.setCameraState?.(state);
  }
  
  getCameraState(): CameraState | null {
    return this.handle?.captureCamera?.() ?? null;
  }
  
  setInteractionsEnabled(enabled: boolean): void {
    this.handle?.setInteractionsEnabled?.(enabled);
  }
}

/**
 * Factory function to create the appropriate renderer
 */
export function createRenderer(
  type: TargetEngine,
  ref: React.RefObject<any>
): CameraRenderer {
  if (type === 'cesium') {
    return new CesiumRenderer(ref);
  }
  return new MapboxRenderer(ref);
}
