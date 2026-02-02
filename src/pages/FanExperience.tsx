import { Badge } from '@/components/ui/badge';
import { Users, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTrackContext } from '@/contexts/TrackContext';

export default function FanExperience() {
  const [viewMode, setViewMode] = useState<'internal' | 'public'>('public');
  const { selectedTrack } = useTrackContext();

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-72 z-10 flex items-center justify-between px-3 h-10 border-b border-border bg-secondary/95 backdrop-blur pointer-events-auto">
        <div className="flex items-center gap-4">
          <Users className="h-4 w-4 text-zone-fan" />
          <span className="text-xs font-mono text-muted-foreground">FAN EXPERIENCE PREVIEW</span>
          <Badge variant="outline" className="text-xs border-zone-fan/50 text-zone-fan">
            {viewMode === 'public' ? 'PUBLIC VIEW' : 'INTERNAL VIEW'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'internal' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setViewMode('internal')}
          >
            <Eye className="h-3 w-3" />
            Internal
          </Button>
          <Button
            variant={viewMode === 'public' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setViewMode('public')}
          >
            <EyeOff className="h-3 w-3" />
            Public
          </Button>
        </div>
      </div>

      {/* Right Panel - Visibility Validation */}
      <div className="absolute top-0 right-0 bottom-0 w-72 z-10 border-l border-border bg-card/95 backdrop-blur flex flex-col pointer-events-auto">
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            VISIBILITY CHECK
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto">
          <div className="space-y-3">
            <div className="rounded-md bg-status-clear/10 border border-status-clear/30 p-3">
              <div className="flex items-center gap-2 text-status-clear text-sm font-medium mb-1">
                <Eye className="h-4 w-4" />
                Visible to Fans
              </div>
              <p className="text-xs text-muted-foreground">5 zones</p>
            </div>
            <div className="rounded-md bg-status-danger/10 border border-status-danger/30 p-3">
              <div className="flex items-center gap-2 text-status-danger text-sm font-medium mb-1">
                <EyeOff className="h-4 w-4" />
                Hidden from Fans
              </div>
              <p className="text-xs text-muted-foreground">8 zones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
