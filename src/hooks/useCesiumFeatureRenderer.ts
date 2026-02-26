import { useEffect, useRef, useCallback } from 'react';
import {
  GeoJsonDataSource,
  Color,
  Viewer,
} from 'cesium';
import type { VenueFeature } from '@/types/feature';
import type { MapOverlay } from '@/types/overlay';
import type { AppMode } from '@/types/viewpoint';

interface UseCesiumFeatureRendererOptions {
  viewer: Viewer | null;
  features: VenueFeature[];
  overlays?: MapOverlay[];
  currentMode: AppMode;
}

export function useCesiumFeatureRenderer({
  viewer,
  features,
  overlays = [],
  currentMode,
}: UseCesiumFeatureRendererOptions): void {
  const dataSourceRef = useRef<GeoJsonDataSource | null>(null);

  const toGeoJSON = useCallback((featureList: VenueFeature[]): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: featureList.map(f => ({
        type: 'Feature' as const,
        id: f.id,
        properties: {
          id: f.id,
          name: f.name,
          featureType: f.type,
          color: f.style.color,
          opacity: f.style.opacity,
          strokeWidth: f.style.strokeWidth,
          fillColor: f.style.fillColor,
          fillOpacity: f.style.fillOpacity,
        },
        geometry: f.geometry as GeoJSON.Geometry,
      })),
    };
  }, []);

  const getVisibleOverlays = useCallback((overlayList: MapOverlay[], mode: AppMode): MapOverlay[] => {
    switch (mode) {
      case 'editor': return [];
      case 'fan': return overlayList.filter(o => o.visibleToFans && o.imageUrl);
      case 'media': return overlayList.filter(o => o.visibleToMedia && o.imageUrl);
      case 'ops': return overlayList.filter(o => o.visibleToOps && o.imageUrl);
      default: return [];
    }
  }, []);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Hide features in editor mode (editor has its own renderer)
    const showFeatures = currentMode !== 'editor';

    const loadFeatures = async () => {
      // Remove old datasource
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current, true);
        dataSourceRef.current = null;
      }

      if (!showFeatures || features.length === 0) return;

      try {
        const geojson = toGeoJSON(features);
        const ds = await GeoJsonDataSource.load(geojson, {
          stroke: Color.WHITE,
          fill: Color.BLUE.withAlpha(0.3),
          strokeWidth: 2,
          clampToGround: true,
        });

        // Style entities based on feature properties
        ds.entities.values.forEach(entity => {
          const props = entity.properties;
          if (!props) return;

          const color = props.color?.getValue?.() || '#3b82f6';
          const opacity = props.opacity?.getValue?.() ?? 0.8;
          const fillColor = props.fillColor?.getValue?.() || color;
          const fillOpacity = props.fillOpacity?.getValue?.() ?? 0.3;

          if (entity.polygon) {
            entity.polygon.material = Color.fromCssColorString(fillColor).withAlpha(fillOpacity) as any;
            entity.polygon.outlineColor = Color.fromCssColorString(color).withAlpha(opacity) as any;
            entity.polygon.outline = true as any;
          }
          if (entity.polyline) {
            entity.polyline.material = Color.fromCssColorString(color).withAlpha(opacity) as any;
            entity.polyline.width = (props.strokeWidth?.getValue?.() ?? 2) as any;
          }
          if (entity.billboard) {
            entity.billboard = undefined as any;
            entity.point = {
              pixelSize: 10,
              color: Color.fromCssColorString(color).withAlpha(opacity),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
            } as any;
          }
        });

        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;
      } catch (e) {
        console.error('Failed to load GeoJSON into Cesium:', e);
      }
    };

    loadFeatures();

    return () => {
      if (dataSourceRef.current && viewer && !viewer.isDestroyed()) {
        try {
          viewer.dataSources.remove(dataSourceRef.current, true);
        } catch {}
        dataSourceRef.current = null;
      }
    };
  }, [viewer, features, currentMode, toGeoJSON]);

  // Overlay rendering in Cesium (image overlays as ground entities)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const visibleOverlays = getVisibleOverlays(overlays, currentMode);

    // For now, overlays in 3D are not rendered (complex Rectangle entities needed)
    // This is a placeholder for future implementation
    if (visibleOverlays.length > 0) {
      console.log(`[CesiumFeatureRenderer] ${visibleOverlays.length} overlays available for 3D rendering`);
    }
  }, [viewer, overlays, currentMode, getVisibleOverlays]);
}
