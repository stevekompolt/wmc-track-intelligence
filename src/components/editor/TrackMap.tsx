import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZ29mYXN0ZXIiLCJhIjoiY204emFjMjJiMDI2czJrcTJiYWVqZmlsbSJ9.GRJpIZBzVU7vyxY7l9wUIQ';

interface TrackMapProps {
  trackName?: string;
}

export function TrackMap({ trackName }: TrackMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-111.9, 40.5], // Default to Utah area
      zoom: 14,
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

  // Update map title overlay when track changes
  useEffect(() => {
    if (map.current && trackName) {
      // Could geocode track location here in the future
      console.log('Track selected:', trackName);
    }
  }, [trackName]);

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
