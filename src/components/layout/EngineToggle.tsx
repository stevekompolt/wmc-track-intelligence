import { Box, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useViewpointContext, type MapEngine } from '@/contexts/ViewpointContext';

interface EngineToggleProps {
  onToggle?: (newEngine: MapEngine) => void;
}

export function EngineToggle({ onToggle }: EngineToggleProps) {
  const { engine, setEngine } = useViewpointContext();

  const is3D = engine === 'cesium';

  const handleClick = () => {
    const newEngine: MapEngine = is3D ? 'mapbox' : 'cesium';
    if (onToggle) {
      onToggle(newEngine);
    } else {
      setEngine(newEngine);
    }
  };

  return (
    <div className="absolute top-14 left-3 z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="bg-card/90 backdrop-blur border border-border hover:bg-card gap-1.5 px-3 font-mono text-xs"
            onClick={handleClick}
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
