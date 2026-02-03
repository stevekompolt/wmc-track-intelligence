import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { TourState } from '@/types/tour';
import { cn } from '@/lib/utils';

interface TourPlayButtonProps {
  tourState: TourState;
  totalDuration: number;
  sceneCount: number;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  disabled?: boolean;
}

export function TourPlayButton({
  tourState,
  totalDuration,
  sceneCount,
  onPlay,
  onPause,
  onReplay,
  disabled = false,
}: TourPlayButtonProps) {
  const getButtonConfig = () => {
    switch (tourState) {
      case 'playing':
        return {
          icon: Pause,
          label: 'Pause Tour',
          action: onPause,
        };
      case 'completed':
        return {
          icon: RotateCcw,
          label: 'Replay Tour',
          action: onReplay,
        };
      case 'paused':
        return {
          icon: Play,
          label: 'Resume Tour',
          action: onPlay,
        };
      default:
        return {
          icon: Play,
          label: 'Play Cinematic Tour',
          action: onPlay,
        };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <Button
        onClick={config.action}
        disabled={disabled}
        size="lg"
        className={cn(
          'w-full h-14 font-display text-base tracking-wide gap-3',
          'bg-primary/90 hover:bg-primary text-primary-foreground',
          'transition-all duration-300',
          tourState === 'idle' && 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
        )}
      >
        <Icon className="h-5 w-5" />
        {config.label}
      </Button>
      
      {(tourState === 'idle' || tourState === 'completed') && sceneCount > 0 && (
        <p className="text-center text-xs text-muted-foreground font-mono">
          {totalDuration}s • {sceneCount} scenes
        </p>
      )}
    </div>
  );
}
