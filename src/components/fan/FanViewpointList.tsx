import { useViewpointContext } from '@/contexts/ViewpointContext';
import { getViewpointIcon } from '@/lib/viewpointIcons';
import { cn } from '@/lib/utils';
import type { Viewpoint } from '@/types/viewpoint';

interface FanViewpointListProps {
  visible: boolean;
}

export function FanViewpointList({ visible }: FanViewpointListProps) {
  const { viewpoints, activeViewpoint, setActiveViewpoint } = useViewpointContext();
  
  // Filter to fan-visible viewpoints
  const fanViewpoints = viewpoints.filter(
    vp => vp.visibleToFans && vp.status === 'published'
  );

  if (!visible || fanViewpoints.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
        Viewpoints
      </p>
      
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {fanViewpoints.map((viewpoint) => {
          const Icon = getViewpointIcon(viewpoint.buttonIcon);
          const isActive = activeViewpoint?.id === viewpoint.id;
          
          return (
            <button
              key={viewpoint.id}
              onClick={() => setActiveViewpoint(viewpoint)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left',
                'transition-colors duration-200',
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">{viewpoint.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
