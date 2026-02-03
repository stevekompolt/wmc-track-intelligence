import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackContext } from '@/contexts/TrackContext';
import { useCinematicTour } from '@/hooks/useCinematicTour';
import { TourPlayButton } from './TourPlayButton';
import { SceneTimeline } from './SceneTimeline';
import { SceneCard } from './SceneCard';
import { FanFooterCTA } from './FanFooterCTA';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronUp } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

export function FanPreviewDrawer() {
  const navigate = useNavigate();
  const { selectedTrack } = useTrackContext();
  const [open, setOpen] = useState(false);
  
  const {
    tourState,
    currentSceneIndex,
    currentScene,
    sceneProgress,
    scenes,
    totalDuration,
    sceneCount,
    play,
    pause,
    replay,
    jumpToScene,
    hasScenes,
  } = useCinematicTour();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-auto">
      <Drawer open={open} onOpenChange={setOpen}>
        {/* Collapsed state - always visible */}
        <div 
          className="p-4 border-t border-border/50"
          style={{ backgroundColor: 'rgba(12, 14, 18, 0.95)' }}
        >
          <div className="flex items-center gap-3">
            {/* Play button (compact) */}
            <div className="flex-1">
              <TourPlayButton
                tourState={tourState}
                totalDuration={totalDuration}
                sceneCount={sceneCount}
                onPlay={play}
                onPause={pause}
                onReplay={replay}
                disabled={!hasScenes}
              />
            </div>
            
            {/* Expand trigger */}
            <DrawerTrigger asChild>
              <button className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </button>
            </DrawerTrigger>
          </div>
        </div>

        <DrawerContent>
          <DrawerHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DrawerTitle className="font-display text-sm uppercase tracking-widest">
                Fan Preview
              </DrawerTitle>
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary"
              >
                LIVE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              {selectedTrack?.name || 'Select a venue'}
            </p>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4">
            {/* Scene Timeline */}
            {hasScenes && (
              <SceneTimeline
                scenes={scenes}
                currentSceneIndex={currentSceneIndex}
                sceneProgress={sceneProgress}
                onJumpToScene={(index) => {
                  jumpToScene(index);
                  setOpen(false);
                }}
              />
            )}

            {/* Current Scene Card */}
            <SceneCard
              scene={currentScene}
              sceneIndex={currentSceneIndex}
              totalScenes={sceneCount}
            />

            {/* Footer CTA */}
            <FanFooterCTA />

            {/* Exit Link */}
            <button
              onClick={() => navigate('/editor')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Exit Fan Preview</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
