import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewpointButton } from './ViewpointButton';
import { useViewpointContext } from '@/contexts/ViewpointContext';

interface ViewpointSelectorProps {
  onAddClick?: () => void;
}

export function ViewpointSelector({ onAddClick }: ViewpointSelectorProps) {
  const { 
    filteredViewpoints, 
    isLoading, 
    activeViewpoint, 
    setActiveViewpoint,
    currentMode,
  } = useViewpointContext();
  
  // Don't render if no viewpoints and not in editor mode
  if (!isLoading && filteredViewpoints.length === 0 && currentMode !== 'editor') {
    return null;
  }
  
  return (
    <div className="absolute bottom-12 left-3 z-10">
      <div className="flex items-center gap-1.5 p-1.5 bg-card/90 backdrop-blur rounded-lg border border-border shadow-lg">
        {isLoading ? (
          // Loading skeletons
          <>
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </>
        ) : (
          // Viewpoint buttons
          filteredViewpoints.map(vp => (
            <ViewpointButton
              key={vp.id}
              viewpoint={vp}
              isActive={activeViewpoint?.id === vp.id}
              onClick={() => setActiveViewpoint(vp)}
            />
          ))
        )}
        
        {/* Add button - only in editor mode */}
        {currentMode === 'editor' && onAddClick && (
          <>
            {filteredViewpoints.length > 0 && (
              <div className="w-px h-6 bg-border mx-0.5" />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAddClick}
                  className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                Save Viewpoint
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
