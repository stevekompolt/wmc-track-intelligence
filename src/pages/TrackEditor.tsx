import { Layers, MousePointer2 } from 'lucide-react';
import { useTrackContext } from '@/contexts/TrackContext';

export default function TrackEditor() {
  const { selectedTrack } = useTrackContext();

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-72 z-10 flex items-center justify-between px-3 h-10 border-b border-border bg-secondary/95 backdrop-blur pointer-events-auto">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">SELECT MODE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">2D VIEW</span>
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="absolute top-0 right-0 bottom-0 w-72 z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col pointer-events-auto">
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
