import type { TourScene } from '@/types/tour';
import { cn } from '@/lib/utils';

interface SceneCardProps {
  scene: TourScene | null;
  sceneIndex: number;
  totalScenes: number;
}

export function SceneCard({ scene, sceneIndex, totalScenes }: SceneCardProps) {
  if (!scene) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-sm text-muted-foreground text-center">
          No scenes available
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-muted/30 border border-border/50',
        'transition-opacity duration-500 animate-fade-scene'
      )}
      key={scene.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Scene counter */}
          <p className="text-[10px] font-mono text-muted-foreground mb-1">
            SCENE {sceneIndex + 1} OF {totalScenes}
          </p>
          
          {/* Scene title */}
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground mb-1.5">
            {scene.name}
          </h3>
          
          {/* Scene description */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {scene.description}
          </p>
        </div>
        
        {/* Optional thumbnail */}
        {scene.thumbnailUrl && (
          <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-muted">
            <img
              src={scene.thumbnailUrl}
              alt={scene.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
