import { Badge } from '@/components/ui/badge';
import { Radio, AlertTriangle } from 'lucide-react';
import { useTrackContext } from '@/contexts/TrackContext';

export default function EventOps() {
  const { selectedTrack } = useTrackContext();

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-72 z-10 flex items-center justify-between px-3 h-10 border-b border-border bg-secondary/95 backdrop-blur pointer-events-auto">
        <div className="flex items-center gap-4">
          <Radio className="h-4 w-4 text-status-clear animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">LIVE OPERATIONS VIEW</span>
          <Badge className="status-clear text-xs">ALL CLEAR</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">NO ACTIVE EVENT</span>
        </div>
      </div>

      {/* Right Panel - Operations Dashboard */}
      <div className="absolute top-0 right-0 bottom-0 w-72 z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col pointer-events-auto">
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-caution" />
            ALERTS & STATUS
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto">
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground font-mono">
                No active alerts
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">ZONE STATUS</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-status-clear/10 border border-status-clear/30 p-2 text-center">
                  <div className="text-lg font-display font-bold text-status-clear">12</div>
                  <div className="text-xs text-muted-foreground">Clear</div>
                </div>
                <div className="rounded-md bg-status-caution/10 border border-status-caution/30 p-2 text-center">
                  <div className="text-lg font-display font-bold text-status-caution">0</div>
                  <div className="text-xs text-muted-foreground">Caution</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
