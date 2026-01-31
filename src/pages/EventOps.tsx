import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, AlertTriangle, Activity } from 'lucide-react';

export default function EventOps() {
  return (
    <div className="flex h-full">
      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <Radio className="h-4 w-4 text-status-clear animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">LIVE OPERATIONS VIEW</span>
            <Badge className="status-clear text-xs">ALL CLEAR</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">NO ACTIVE EVENT</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-background">
          <Card className="border-dashed">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Activity className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-display text-lg">Operations Map</p>
                <p className="text-sm text-muted-foreground">
                  Live track status and zone monitoring
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Operations Dashboard */}
      <div className="w-80 border-l border-border bg-card/50 flex flex-col">
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
