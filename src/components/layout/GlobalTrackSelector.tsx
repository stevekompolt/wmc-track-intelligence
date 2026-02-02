import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackContext } from '@/contexts/TrackContext';

export function GlobalTrackSelector() {
  const { selectedTrack, setSelectedTrack, tracks, isLoading } = useTrackContext();

  const handleValueChange = (value: string) => {
    const track = tracks.find((t) => t.id === value) ?? null;
    setSelectedTrack(track);
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-40" />;
  }

  if (!tracks.length) {
    return (
      <span className="text-xs text-muted-foreground font-mono">
        No tracks
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary" />
      <Select
        value={selectedTrack?.id ?? ''}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-48 h-8 text-xs border-primary/30">
          <SelectValue placeholder="Select track..." />
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
