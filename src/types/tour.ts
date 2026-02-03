// Tour state machine
export type TourState = 'idle' | 'playing' | 'paused' | 'completed';

// Single scene in the cinematic tour
export interface TourScene {
  id: string;
  viewpointId: string;
  name: string;
  description: string;
  duration: number; // seconds
  thumbnailUrl?: string;
}

// Tour configuration
export interface TourConfig {
  scenes: TourScene[];
  totalDuration: number; // seconds
}

// Tour playback state
export interface TourPlaybackState {
  state: TourState;
  currentSceneIndex: number;
  progress: number; // 0-1 overall progress
  sceneProgress: number; // 0-1 within current scene
}
