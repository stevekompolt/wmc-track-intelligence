import { Card, CardContent } from '@/components/ui/card';
import { Map, Layers, MousePointer2 } from 'lucide-react';
import { TrackMap } from '@/components/editor/TrackMap';
import { useTrackContext } from '@/contexts/TrackContext';

export default function TrackEditor() {
  const { selectedTrack } = useTrackContext();

  return (
    <div className="flex h-full">
      {/* Center - Map Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">SELECT MODE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">2D VIEW</span>
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
          )}
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="w-72 border-l border-border bg-card/50 flex flex-col">
        {/* Feature Toolbox */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            FEATURE TOOLBOX
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto border-b border-border">
          <p className="text-xs text-muted-foreground font-mono">
            {selectedTrack
              ? 'Drawing tools will be available here'
              : 'Select a track to begin editing'}
          </p>
        </div>
        
        {/* Feature Inspector */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            FEATURE INSPECTOR
          </h2>
        </div>
        <div className="flex-1 p-3">
          <p className="text-xs text-muted-foreground font-mono">
            {selectedTrack
              ? 'Select a feature to view properties'
              : 'Select a track first'}
          </p>
        </div>
      </div>
    </div>
  );
}
