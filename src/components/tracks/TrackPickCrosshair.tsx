import { useTrackPick } from '@/contexts/TrackPickContext';

/** Center-of-map crosshair shown while an admin is picking a new track location. */
export function TrackPickCrosshair() {
  const { isPicking } = useTrackPick();
  if (!isPicking) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div className="relative h-24 w-24">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/70" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-primary/70" />
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary" />
      </div>
    </div>
  );
}