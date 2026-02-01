export interface Track {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export interface TrackState {
  selectedTrack: Track | null;
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
}
