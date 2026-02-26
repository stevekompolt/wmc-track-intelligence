import { Box, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useViewpointContext } from '@/contexts/ViewpointContext';

export function EngineToggle() {
  const { engine, setEngine } = useViewpointContext();

  const is3D = engine === 'cesium';

  return (
    <div className="absolute top-14 left-3 z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="bg-card/90 backdrop-blur border border-border hover:bg-card gap-1.5 px-3 font-mono text-xs"
            onClick={() => setEngine(is3D ? 'mapbox' : 'cesium')}
          >
            {is3D ? (
              <>
                <Globe className="h-3.5 w-3.5 text-primary" />
                3D
              </>
            ) : (
              <>
                <Box className="h-3.5 w-3.5 text-muted-foreground" />
                2D
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Switch to {is3D ? '2D (Mapbox)' : '3D (Cesium)'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
