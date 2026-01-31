import { Card, CardContent } from '@/components/ui/card';
import { Map, Layers, MousePointer2 } from 'lucide-react';

export default function TrackEditor() {
  return (
    <div className="flex h-full">
      {/* Left Panel - Feature Toolbox */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            FEATURE TOOLBOX
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto">
          <p className="text-xs text-muted-foreground font-mono">
            Drawing tools will be available here
          </p>
        </div>
      </div>

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
        <div className="flex-1 flex items-center justify-center bg-background">
          <Card className="border-dashed">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Map className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-display text-lg">Map Canvas</p>
                <p className="text-sm text-muted-foreground">
                  Mapbox integration coming next
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Feature Inspector */}
      <div className="w-72 border-l border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            FEATURE INSPECTOR
          </h2>
        </div>
        <div className="flex-1 p-3">
          <p className="text-xs text-muted-foreground font-mono">
            Select a feature to view properties
          </p>
        </div>
      </div>
    </div>
  );
}
