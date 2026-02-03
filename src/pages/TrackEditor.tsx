import { useState } from 'react';
import { Layers, MousePointer2, MapPin, Spline, Hexagon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SaveViewpointDialog } from '@/components/viewpoints/SaveViewpointDialog';
import { useTrackContext } from '@/contexts/TrackContext';

export default function TrackEditor() {
  const { selectedTrack } = useTrackContext();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  return (
    <div className="relative h-full pointer-events-none">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-72 z-10 flex items-center justify-between px-3 h-10 bg-secondary/95 backdrop-blur pointer-events-auto">
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
        <div className="p-3 border-b border-border">
          {selectedTrack ? (
            <div className="grid grid-cols-2 gap-2">
              {/* Add Point - placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    disabled
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Point</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Coming soon</TooltipContent>
              </Tooltip>
              
              {/* Add Line - placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    disabled
                  >
                    <Spline className="h-4 w-4" />
                    <span className="text-xs">Line</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Coming soon</TooltipContent>
              </Tooltip>
              
              {/* Add Polygon - placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    disabled
                  >
                    <Hexagon className="h-4 w-4" />
                    <span className="text-xs">Polygon</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Coming soon</TooltipContent>
              </Tooltip>
              
              {/* Save Viewpoint - functional */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2 hover:border-primary hover:text-primary"
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-xs">Viewpoint</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save current camera position</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">
              Select a track to begin editing
            </p>
          )}
        </div>
        
        {/* Feature Inspector */}
        <div className="p-3 border-b border-border">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            FEATURE INSPECTOR
          </h2>
        </div>
        <div className="flex-1 p-3 overflow-auto">
          <p className="text-xs text-muted-foreground font-mono">
            {selectedTrack
              ? 'Select a feature to view properties'
              : 'Select a track first'}
          </p>
        </div>
      </div>
      
      {/* Save Viewpoint Dialog */}
      <SaveViewpointDialog 
        open={saveDialogOpen} 
        onOpenChange={setSaveDialogOpen} 
      />
    </div>
  );
}
