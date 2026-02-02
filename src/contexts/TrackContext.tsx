import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Track } from '@/types/track';
import { useTracks } from '@/hooks/useTracks';

const STORAGE_KEY = 'wmc_last_track_id';

interface TrackContextType {
  selectedTrack: Track | null;
  setSelectedTrack: (track: Track | null) => void;
  tracks: Track[];
  isLoading: boolean;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export function TrackProvider({ children }: { children: ReactNode }) {
  const [selectedTrack, setSelectedTrackState] = useState<Track | null>(null);
  const { data: tracks = [], isLoading } = useTracks();
  const hasAutoSelected = useRef(false);

  // Auto-select saved track once tracks load
  useEffect(() => {
    if (hasAutoSelected.current || !tracks.length) return;
    
    const savedTrackId = localStorage.getItem(STORAGE_KEY);
    if (savedTrackId) {
      const savedTrack = tracks.find((t) => t.id === savedTrackId);
      if (savedTrack) {
        setSelectedTrackState(savedTrack);
      }
    }
    hasAutoSelected.current = true;
  }, [tracks]);

  // Wrapper to persist selection to localStorage
  const setSelectedTrack = (track: Track | null) => {
    setSelectedTrackState(track);
    if (track) {
      localStorage.setItem(STORAGE_KEY, track.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <TrackContext.Provider
      value={{
        selectedTrack,
        setSelectedTrack,
        tracks,
        isLoading,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
}

export function useTrackContext() {
  const context = useContext(TrackContext);
  if (context === undefined) {
    throw new Error('useTrackContext must be used within a TrackProvider');
  }
  return context;
}
