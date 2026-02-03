import type { CameraState } from '@/types/viewpoint';
import type { CameraTarget, TransitionOptions, TargetEngine, LookAtTarget } from '@/types/camera';

/**
 * Abstract camera renderer interface
 * Allows the engine to work with both Mapbox and Cesium
 */
export interface CameraRenderer {
  /** Animate camera to target position */
  flyTo(target: CameraTarget, options?: TransitionOptions): void;
  
  /** Look at a specific target (for orbit behavior) */
  lookAt(target: LookAtTarget, heading: number, pitch: number, range: number): void;
  
  /** Directly set camera state without animation */
  setCameraState(state: CameraState): void;
  
  /** Get current camera state */
  getCameraState(): CameraState | null;
  
  /** Enable/disable user interactions */
  setInteractionsEnabled(enabled: boolean): void;
  
  /** Get the target engine type */
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
  
  getEngineType(): TargetEngine {
    return 'mapbox';
  }
  
  flyTo(target: CameraTarget, options?: TransitionOptions): void {
    const handle = this.mapRef.current;
    if (!handle) return;
    
    handle.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.height,
      bearing: target.heading,
      pitch: Math.abs(target.pitch), // Mapbox uses positive pitch
      duration: options?.duration || 8000,
    });
  }
  
  lookAt(target: LookAtTarget, heading: number, pitch: number, range: number): void {
    // For Mapbox, we simulate lookAt by positioning camera
    // This is a simplified implementation
    const handle = this.mapRef.current;
    if (!handle) return;
    
    // Calculate camera position based on range and heading
    const distanceInDegrees = range / 111000; // Rough meters to degrees
    const headingRad = (heading * Math.PI) / 180;
    
    const cameraLat = target.latitude + Math.cos(headingRad) * distanceInDegrees;
    const cameraLon = target.longitude + Math.sin(headingRad) * distanceInDegrees;
    
    handle.flyTo({
      center: [cameraLon, cameraLat],
      bearing: (heading + 180) % 360, // Look toward target
      pitch: Math.abs(pitch),
      duration: 2000,
    });
  }
  
  setCameraState(state: CameraState): void {
    const handle = this.mapRef.current;
    if (!handle?.setCameraState) return;
    
    handle.setCameraState(state);
  }
  
  getCameraState(): CameraState | null {
    // Would need to query map instance
    return null;
  }
  
  setInteractionsEnabled(enabled: boolean): void {
    const handle = this.mapRef.current;
    if (!handle?.setInteractionsEnabled) return;
    
    handle.setInteractionsEnabled(enabled);
  }
}

/**
 * Cesium renderer implementation (future-proofing)
 * This is a placeholder that documents the expected Cesium API
 */
export class CesiumRenderer implements CameraRenderer {
  private viewer: any; // Cesium.Viewer
  
  constructor(viewer: any) {
    this.viewer = viewer;
  }
  
  getEngineType(): TargetEngine {
    return 'cesium';
  }
  
  flyTo(target: CameraTarget, options?: TransitionOptions): void {
    if (!this.viewer?.camera) return;
    
    // Cesium uses Cartesian3 for destination
    // This would use: Cesium.Cartesian3.fromDegrees(lon, lat, height)
    const destination = {
      longitude: target.longitude,
      latitude: target.latitude,
      height: target.height,
    };
    
    // Convert degrees to radians for Cesium
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    
    this.viewer.camera.flyTo({
      destination,
      orientation: {
        heading: toRadians(target.heading),
        pitch: toRadians(target.pitch), // Cesium uses negative pitch
        roll: toRadians(target.roll),
      },
      duration: (options?.duration || 8000) / 1000, // Cesium uses seconds
    });
  }
  
  lookAt(target: LookAtTarget, heading: number, pitch: number, range: number): void {
    if (!this.viewer?.camera) return;
    
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    
    // Cesium lookAt with HeadingPitchRange
    // this.viewer.camera.lookAt(
    //   Cesium.Cartesian3.fromDegrees(target.longitude, target.latitude, target.height),
    //   new Cesium.HeadingPitchRange(toRadians(heading), toRadians(pitch), range)
    // );
    
    console.log('CesiumRenderer.lookAt - would call camera.lookAt');
  }
  
  setCameraState(state: CameraState): void {
    if (!this.viewer?.camera) return;
    
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    
    // this.viewer.camera.setView({
    //   destination: Cesium.Cartesian3.fromDegrees(state.longitude, state.latitude, state.height),
    //   orientation: {
    //     heading: toRadians(state.heading),
    //     pitch: toRadians(state.pitch),
    //     roll: toRadians(state.roll),
    //   }
    // });
    
    console.log('CesiumRenderer.setCameraState - would call camera.setView');
  }
  
  getCameraState(): CameraState | null {
    if (!this.viewer?.camera) return null;
    
    // const camera = this.viewer.camera;
    // const position = Cesium.Cartographic.fromCartesian(camera.position);
    // const toDegrees = (rad: number) => (rad * 180) / Math.PI;
    
    // return {
    //   latitude: toDegrees(position.latitude),
    //   longitude: toDegrees(position.longitude),
    //   height: position.height,
    //   heading: toDegrees(camera.heading),
    //   pitch: toDegrees(camera.pitch),
    //   roll: toDegrees(camera.roll),
    // };
    
    return null;
  }
  
  setInteractionsEnabled(enabled: boolean): void {
    if (!this.viewer?.scene) return;
    
    // this.viewer.scene.screenSpaceCameraController.enableRotate = enabled;
    // this.viewer.scene.screenSpaceCameraController.enableTranslate = enabled;
    // this.viewer.scene.screenSpaceCameraController.enableZoom = enabled;
    // this.viewer.scene.screenSpaceCameraController.enableTilt = enabled;
    // this.viewer.scene.screenSpaceCameraController.enableLook = enabled;
    
    console.log('CesiumRenderer.setInteractionsEnabled:', enabled);
  }
}

/**
 * Factory function to create the appropriate renderer
 */
export function createRenderer(
  type: TargetEngine,
  ref: React.RefObject<any> | any
): CameraRenderer {
  if (type === 'cesium') {
    return new CesiumRenderer(ref);
  }
  return new MapboxRenderer(ref);
}
