import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import {
  Viewer,
  Cartesian3,
  Math as CesiumMath,
  Cartographic,
  CesiumTerrainProvider,
  IonResource,
  SceneMode,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { initCesium, zoomToHeight, heightToZoom } from '@/lib/cesiumConfig';
import type { Viewpoint, CameraState } from '@/types/viewpoint';

// Initialize Cesium Ion token
initCesium();

interface CesiumMapProps {
  trackName?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  initialCameraState?: CameraState | null;
}

export interface CesiumMapHandle {
  flyToViewpoint: (viewpoint: Viewpoint) => void;
  captureCamera: () => CameraState | null;
  setCameraState: (state: CameraState) => void;
  setInteractionsEnabled: (enabled: boolean) => void;
  getMapInstance: () => Viewer | null;
  getViewer: () => Viewer | null;
}

export const CesiumMap = forwardRef<CesiumMapHandle, CesiumMapProps>(
  function CesiumMap({ trackName, latitude, longitude, zoom, initialCameraState }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      flyToViewpoint: (viewpoint: Viewpoint) => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        const height = zoomToHeight(viewpoint.height);

        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            viewpoint.longitude,
            viewpoint.latitude,
            height
          ),
          orientation: {
            heading: CesiumMath.toRadians(viewpoint.heading),
            pitch: CesiumMath.toRadians(-viewpoint.pitch), // Mapbox positive → Cesium negative
            roll: CesiumMath.toRadians(viewpoint.roll),
          },
          duration: 2,
        });
      },

      captureCamera: (): CameraState | null => {
        const viewer = viewerRef.current;
        if (!viewer) return null;

        const camera = viewer.camera;
        const carto = Cartographic.fromCartesian(camera.position);

        return {
          latitude: CesiumMath.toDegrees(carto.latitude),
          longitude: CesiumMath.toDegrees(carto.longitude),
          height: heightToZoom(carto.height),
          heading: CesiumMath.toDegrees(camera.heading),
          pitch: -CesiumMath.toDegrees(camera.pitch), // Cesium negative → Mapbox positive
          roll: CesiumMath.toDegrees(camera.roll),
        };
      },

      setCameraState: (state: CameraState) => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        const height = zoomToHeight(state.height);

        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(
            state.longitude,
            state.latitude,
            height
          ),
          orientation: {
            heading: CesiumMath.toRadians(state.heading),
            pitch: CesiumMath.toRadians(-state.pitch),
            roll: CesiumMath.toRadians(state.roll),
          },
        });
      },

      setInteractionsEnabled: (enabled: boolean) => {
        const viewer = viewerRef.current;
        if (!viewer?.scene) return;

        const controller = viewer.scene.screenSpaceCameraController;
        controller.enableRotate = enabled;
        controller.enableTranslate = enabled;
        controller.enableZoom = enabled;
        controller.enableTilt = enabled;
        controller.enableLook = enabled;
      },

      getMapInstance: () => viewerRef.current,
      getViewer: () => viewerRef.current,
    }), []);

    // Create viewer
    useEffect(() => {
      if (!containerRef.current || viewerRef.current) return;

      const viewer = new Viewer(containerRef.current, {
        sceneMode: SceneMode.SCENE3D,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        creditContainer: document.createElement('div'), // Hide credits
      });

      // Add world terrain
      CesiumTerrainProvider.fromIonAssetId(1).then(terrainProvider => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.terrainProvider = terrainProvider;
        }
      });

      viewerRef.current = viewer;

      // Set initial camera
      const initLat = initialCameraState?.latitude ?? latitude ?? 40.5;
      const initLon = initialCameraState?.longitude ?? longitude ?? -111.9;
      const initZoom = initialCameraState?.height ?? zoom ?? 14;
      const initHeading = initialCameraState?.heading ?? 0;
      const initPitch = initialCameraState?.pitch ?? 45;
      const initRoll = initialCameraState?.roll ?? 0;

      const height = zoomToHeight(initZoom);

      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(initLon, initLat, height),
        orientation: {
          heading: CesiumMath.toRadians(initHeading),
          pitch: CesiumMath.toRadians(-initPitch),
          roll: CesiumMath.toRadians(initRoll),
        },
      });

      setIsReady(true);

      return () => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
        viewerRef.current = null;
        setIsReady(false);
      };
    }, []);

    // Fly to new location when coordinates change (skip initial)
    const initialMount = useRef(true);
    useEffect(() => {
      if (initialMount.current) {
        initialMount.current = false;
        return;
      }
      if (viewerRef.current && latitude && longitude) {
        const height = zoomToHeight(zoom ?? 14);
        viewerRef.current.camera.flyTo({
          destination: Cartesian3.fromDegrees(longitude, latitude, height),
          duration: 2,
        });
      }
    }, [latitude, longitude, zoom]);

    return (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }
);
