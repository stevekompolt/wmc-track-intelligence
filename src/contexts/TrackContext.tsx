import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { Track } from '@/types/track';
import { useTracks } from '@/hooks/useTracks';

const STORAGE_KEY = 'wmc_last_track_id';

interface TrackContextType {
  selectedTrack: Track | null;
  setSelectedTrack: (track: Track | null) => void;
  tracks: Track[];
  isLoading: boolean;
  /** Merge a just-created track into the list (feed is eventually consistent) */
  addLocalTrack: (track: Track) => void;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export function TrackProvider({ children }: { children: ReactNode }) {
  const [selectedTrack, setSelectedTrackState] = useState<Track | null>(null);
  const { data: fetchedTracks = [], isLoading } = useTracks();
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const hasAutoSelected = useRef(false);

  const tracks = useMemo(() => {
    if (!localTracks.length) return fetchedTracks;
    const merged = [...fetchedTracks];
    for (const local of localTracks) {
      if (!merged.some((t) => t.id === local.id)) merged.push(local);
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [fetchedTracks, localTracks]);

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

  const addLocalTrack = useCallback((track: Track) => {
    setLocalTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev : [...prev, track],
    );
  }, []);

  return (
    <TrackContext.Provider
      value={{
        selectedTrack,
        setSelectedTrack,
        tracks,
        isLoading,
        addLocalTrack,
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
