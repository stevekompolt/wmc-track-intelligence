import { Card, CardContent } from '@/components/ui/card';
import { Camera, Eye, Video } from 'lucide-react';
import { TrackMap } from '@/components/editor/TrackMap';
import { useTrackContext } from '@/contexts/TrackContext';

export default function MediaIntelligence() {
  const { selectedTrack } = useTrackContext();

  return (
    <div className="flex h-full">
      {/* Center - Map with Camera Views */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-3 h-10 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <Eye className="h-4 w-4 text-zone-media" />
            <span className="text-xs font-mono text-muted-foreground">COVERAGE ANALYSIS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">12 CAMERAS</span>
          </div>
        </div>
        <div className="flex-1 bg-background">
          {selectedTrack ? (
            <TrackMap 
              trackName={selectedTrack.name}
              latitude={selectedTrack.latitude}
              longitude={selectedTrack.longitude}
              zoom={selectedTrack.zoom}
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center">
              <Card className="border-dashed">
                <CardContent className="p-8 flex flex-col items-center gap-4">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-display text-lg">Media Coverage Map</p>
                    <p className="text-sm text-muted-foreground">
                      Select a track from the nav bar
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="w-72 border-l border-border bg-card/50 flex flex-col">
        {/* Cameras */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <Video className="h-4 w-4 text-zone-media" />
            CAMERAS
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto border-b border-border">
          <p className="text-xs text-muted-foreground font-mono">
            {selectedTrack
              ? 'Camera positions will be listed here'
              : 'Select a track first'}
          </p>
        </div>
        
        {/* Playback Controls */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            PLAYBACK
          </h2>
        </div>
        <div className="flex-1 p-3">
          <p className="text-xs text-muted-foreground font-mono">
            Timeline and replay controls
          </p>
        </div>
      </div>
    </div>
  );
}
