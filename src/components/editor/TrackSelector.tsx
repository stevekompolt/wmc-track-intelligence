import { MapPin, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useTracks } from '@/hooks/useTracks';
import { Track } from '@/types/track';

interface TrackSelectorProps {
  selectedTrack: Track | null;
  onSelectTrack: (track: Track | null) => void;
}

export function TrackSelector({ selectedTrack, onSelectTrack }: TrackSelectorProps) {
  const { data: tracks, isLoading, error, refetch } = useTracks();

  const handleValueChange = (value: string) => {
    const track = tracks?.find((t) => t.id === value) ?? null;
    onSelectTrack(track);
  };

  if (isLoading) {
    return (
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-wider">
            TRACK
          </span>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-wider">
            TRACK
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive font-mono">Failed to load</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-wider">
            TRACK
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          No tracks available
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-display text-sm font-semibold tracking-wider">
          TRACK
        </span>
      </div>
      <Select
        value={selectedTrack?.id ?? ''}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full text-xs">
          <SelectValue placeholder="Select a track..." />
        </SelectTrigger>
        <SelectContent>
          {tracks.map((track) => (
            <SelectItem key={track.id} value={track.id} className="text-xs">
              {track.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
