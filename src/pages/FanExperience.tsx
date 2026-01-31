import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, EyeOff, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function FanExperience() {
  const [viewMode, setViewMode] = useState<'internal' | 'public'>('public');

  return (
    <div className="flex h-full">
      {/* Center - Public View Preview */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/30">
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
        <div className="flex-1 flex items-center justify-center bg-background">
          <Card className="border-dashed">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <MapPin className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-display text-lg">Fan View Map</p>
                <p className="text-sm text-muted-foreground">
                  Public-safe track layout and spectator zones
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Visibility Validation */}
      <div className="w-72 border-l border-border bg-card/50 flex flex-col">
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
