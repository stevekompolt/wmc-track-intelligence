export interface Track {
  id: string;
  name: string;
  description?: string;
}

export interface TrackState {
  selectedTrack: Track | null;
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
}
