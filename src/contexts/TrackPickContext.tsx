import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface TrackPickContextType {
  /** True while the admin is positioning the map to pick a new track location */
  isPicking: boolean;
  startPicking: () => void;
  stopPicking: () => void;
}

const TrackPickContext = createContext<TrackPickContextType | undefined>(undefined);

export function TrackPickProvider({ children }: { children: ReactNode }) {
  const [isPicking, setIsPicking] = useState(false);
  const startPicking = useCallback(() => setIsPicking(true), []);
  const stopPicking = useCallback(() => setIsPicking(false), []);

  return (
    <TrackPickContext.Provider value={{ isPicking, startPicking, stopPicking }}>
      {children}
    </TrackPickContext.Provider>
  );
}

export function useTrackPick() {
  const ctx = useContext(TrackPickContext);
  if (!ctx) throw new Error('useTrackPick must be used within a TrackPickProvider');
  return ctx;
}