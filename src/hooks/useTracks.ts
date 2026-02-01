import { useQuery } from '@tanstack/react-query';
import { fetchTracks } from '@/services/tracksApi';

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: fetchTracks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
