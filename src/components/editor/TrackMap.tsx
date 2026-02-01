import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZ29mYXN0ZXIiLCJhIjoiY204emFjMjJiMDI2czJrcTJiYWVqZmlsbSJ9.GRJpIZBzVU7vyxY7l9wUIQ';

// Default coordinates (Utah area)
const DEFAULT_CENTER: [number, number] = [-111.9, 40.5];
const DEFAULT_ZOOM = 14;

interface TrackMapProps {
  trackName?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export function TrackMap({ trackName, latitude, longitude, zoom }: TrackMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Use provided coordinates or defaults
    const initialCenter: [number, number] = 
      latitude && longitude ? [longitude, latitude] : DEFAULT_CENTER;
    const initialZoom = zoom || DEFAULT_ZOOM;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
      pitch: 45,
      bearing: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fly to new location when coordinates change
  useEffect(() => {
    if (map.current && latitude && longitude) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: zoom || DEFAULT_ZOOM,
        duration: 2000,
        essential: true,
      });
    }
  }, [latitude, longitude, zoom]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {trackName && (
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur border border-border rounded px-3 py-1.5">
          <span className="text-xs font-mono text-foreground">{trackName}</span>
        </div>
      )}
    </div>
  );
}
