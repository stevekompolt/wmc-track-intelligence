import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TourScene } from '@/types/tour';

interface SceneTimelineProps {
  scenes: TourScene[];
  currentSceneIndex: number;
  sceneProgress: number;
  onJumpToScene: (index: number) => void;
}

export function SceneTimeline({
  scenes,
  currentSceneIndex,
  sceneProgress,
  onJumpToScene,
}: SceneTimelineProps) {
  if (scenes.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-center gap-2 py-4">
        {scenes.map((scene, index) => {
          const isActive = index === currentSceneIndex;
          const isCompleted = index < currentSceneIndex;
          
          return (
            <Tooltip key={scene.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onJumpToScene(index)}
                  className={cn(
                    'relative w-3 h-3 rounded-full transition-all duration-300',
                    'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/50',
                    isCompleted && 'bg-primary',
                    isActive && 'bg-primary ring-2 ring-primary/30',
                    !isActive && !isCompleted && 'bg-muted-foreground/40'
                  )}
                  aria-label={`Go to ${scene.name}`}
                >
                  {/* Progress indicator for active scene */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-full bg-primary/50 animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border">
                <p className="text-xs font-medium">{scene.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
