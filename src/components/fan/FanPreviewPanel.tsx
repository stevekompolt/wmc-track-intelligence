import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackContext } from '@/contexts/TrackContext';
import { useCinematicTour } from '@/hooks/useCinematicTour';
import { TourPlayButton } from './TourPlayButton';
import { SceneTimeline } from './SceneTimeline';
import { SceneCard } from './SceneCard';
import { FanViewpointList } from './FanViewpointList';
import { ExperienceToggles } from './ExperienceToggles';
import { FanFooterCTA } from './FanFooterCTA';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

export function FanPreviewPanel() {
  const navigate = useNavigate();
  const { selectedTrack } = useTrackContext();
  const [experienceMode, setExperienceMode] = useState<'day' | 'night'>('day');
  const [vipEmphasis, setVipEmphasis] = useState(false);
  
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
    isPlaying,
    hasScenes,
  } = useCinematicTour();

  const showViewpointList = !isPlaying && hasScenes;

  return (
    <div 
      className="absolute top-0 right-0 bottom-0 w-[340px] z-10 flex flex-col pointer-events-auto"
      style={{ backgroundColor: 'rgba(12, 14, 18, 0.85)' }}
    >
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm border-l border-border/50" />
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col p-5 overflow-hidden">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Fan Preview
            </h1>
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary"
            >
              LIVE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedTrack?.name || 'Select a venue'}
          </p>
        </header>

        {/* Primary Action */}
        <div className="mb-4">
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

        {/* Scene Timeline */}
        {hasScenes && (
          <SceneTimeline
            scenes={scenes}
            currentSceneIndex={currentSceneIndex}
            sceneProgress={sceneProgress}
            onJumpToScene={jumpToScene}
          />
        )}

        {/* Current Scene Card */}
        <div className="mb-4">
          <SceneCard
            scene={currentScene}
            sceneIndex={currentSceneIndex}
            totalScenes={sceneCount}
          />
        </div>

        {/* Viewpoint List (when paused/completed) */}
        <div className="mb-4">
          <FanViewpointList visible={showViewpointList} />
        </div>

        {/* Experience Toggles */}
        <div className="mb-4">
          <ExperienceToggles
            experienceMode={experienceMode}
            vipEmphasis={vipEmphasis}
            onModeChange={setExperienceMode}
            onVipChange={setVipEmphasis}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer CTA */}
        <FanFooterCTA />

        {/* Exit Link */}
        <button
          onClick={() => navigate('/editor')}
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Exit Fan Preview</span>
        </button>
      </div>
    </div>
  );
}
