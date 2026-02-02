import { Card, CardContent } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { TrackMap } from '@/components/editor/TrackMap';
import { useTrackContext } from '@/contexts/TrackContext';

export function SharedMapContainer() {
  const { selectedTrack } = useTrackContext();

  if (!selectedTrack) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <Card className="border-dashed">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Map className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-display text-lg">Map Canvas</p>
              <p className="text-sm text-muted-foreground">
                Select a track from the nav bar to load the map
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TrackMap
      trackName={selectedTrack.name}
      latitude={selectedTrack.latitude}
      longitude={selectedTrack.longitude}
      zoom={selectedTrack.zoom}
    />
  );
}
