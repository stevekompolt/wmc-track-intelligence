import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getViewpointIcon } from '@/lib/viewpointIcons';
import { cn } from '@/lib/utils';
import type { Viewpoint } from '@/types/viewpoint';

interface ViewpointButtonProps {
  viewpoint: Viewpoint;
  isActive: boolean;
  onClick: () => void;
}

export function ViewpointButton({ viewpoint, isActive, onClick }: ViewpointButtonProps) {
  const Icon = getViewpointIcon(viewpoint.buttonIcon);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          onClick={onClick}
          className={cn(
            'h-9 w-9 bg-card/90 backdrop-blur border transition-all',
            isActive
              ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
              : 'border-border hover:border-primary/50 hover:bg-card'
          )}
        >
          <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-foreground')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-xs">
        {viewpoint.name}
      </TooltipContent>
    </Tooltip>
  );
}
