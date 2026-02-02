import { Eye, Video } from 'lucide-react';
import { useTrackContext } from '@/contexts/TrackContext';

export default function MediaIntelligence() {
  const { selectedTrack } = useTrackContext();

  return (
    <div className="relative h-full">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-72 z-10 flex items-center justify-between px-3 h-10 border-b border-border bg-secondary/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Eye className="h-4 w-4 text-zone-media" />
          <span className="text-xs font-mono text-muted-foreground">COVERAGE ANALYSIS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">12 CAMERAS</span>
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="absolute top-0 right-0 bottom-0 w-72 z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col">
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
