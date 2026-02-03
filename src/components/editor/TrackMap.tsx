import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Viewpoint, CameraState } from '@/types/viewpoint';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZ29mYXN0ZXIiLCJhIjoiY204emFjMjJiMDI2czJrcTJiYWVqZmlsbSJ9.GRJpIZBzVU7vyxY7l9wUIQ';

// Default coordinates (Utah area)
const DEFAULT_CENTER: [number, number] = [-111.9, 40.5];
const DEFAULT_ZOOM = 14;

const MAP_STYLES = [
  { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'satellite-streets', name: 'Satellite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'outdoors', name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
];

interface TrackMapProps {
  trackName?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

// Imperative handle interface
export interface TrackMapHandle {
  flyToViewpoint: (viewpoint: Viewpoint) => void;
  captureCamera: () => CameraState | null;
  setCameraState: (state: CameraState) => void;
  setInteractionsEnabled: (enabled: boolean) => void;
  getMapInstance: () => mapboxgl.Map | null;
}

export const TrackMap = forwardRef<TrackMapHandle, TrackMapProps>(
  function TrackMap({ trackName, latitude, longitude, zoom }, ref) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [currentStyle, setCurrentStyle] = useState('satellite-streets');

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      flyToViewpoint: (viewpoint: Viewpoint) => {
        if (!map.current) return;
        
        map.current.flyTo({
          center: [viewpoint.longitude, viewpoint.latitude],
          zoom: viewpoint.height,
          bearing: viewpoint.heading,
          pitch: viewpoint.pitch,
          duration: 2000,
          essential: true,
        });
      },
      
      captureCamera: (): CameraState | null => {
        if (!map.current) return null;
        
        const center = map.current.getCenter();
        return {
          latitude: center.lat,
          longitude: center.lng,
          height: map.current.getZoom(),
          heading: map.current.getBearing(),
          pitch: map.current.getPitch(),
          roll: 0,
        };
      },
      
      setCameraState: (state: CameraState) => {
        if (!map.current) return;
        
        map.current.setCenter([state.longitude, state.latitude]);
        map.current.setZoom(state.height);
        map.current.setBearing(state.heading);
        map.current.setPitch(state.pitch);
      },
      
      setInteractionsEnabled: (enabled: boolean) => {
        if (!map.current) return;
        
        if (enabled) {
          map.current.dragPan.enable();
          map.current.dragRotate.enable();
          map.current.scrollZoom.enable();
          map.current.touchZoomRotate.enable();
          map.current.doubleClickZoom.enable();
          map.current.keyboard.enable();
        } else {
          map.current.dragPan.disable();
          map.current.dragRotate.disable();
          map.current.scrollZoom.disable();
          map.current.touchZoomRotate.disable();
          map.current.doubleClickZoom.disable();
          map.current.keyboard.disable();
        }
      },
      
      getMapInstance: () => map.current,
    }), []);

    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      // Use provided coordinates or defaults
      const initialCenter: [number, number] = 
        latitude && longitude ? [longitude, latitude] : DEFAULT_CENTER;
      const initialZoom = zoom || DEFAULT_ZOOM;

      const initialStyleUrl = MAP_STYLES.find(s => s.id === currentStyle)?.url || MAP_STYLES[4].url;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: initialStyleUrl,
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

    const handleStyleChange = (styleId: string) => {
      if (!map.current) return;
      
      const style = MAP_STYLES.find(s => s.id === styleId);
      if (!style) return;

      // Preserve camera position
      const center = map.current.getCenter();
      const currentZoom = map.current.getZoom();
      const pitch = map.current.getPitch();
      const bearing = map.current.getBearing();

      map.current.setStyle(style.url);
      setCurrentStyle(styleId);

      // Restore camera position after style loads
      map.current.once('style.load', () => {
        map.current?.setCenter(center);
        map.current?.setZoom(currentZoom);
        map.current?.setPitch(pitch);
        map.current?.setBearing(bearing);
      });
    };

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />
        

        {/* Style Switcher */}
        <div className="absolute bottom-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="bg-card/90 backdrop-blur border border-border hover:bg-card">
                <Layers className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {MAP_STYLES.map((style) => (
                <DropdownMenuItem
                  key={style.id}
                  onClick={() => handleStyleChange(style.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>{style.name}</span>
                  {currentStyle === style.id && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
);
