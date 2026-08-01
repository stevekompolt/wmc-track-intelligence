import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTrack, type CreateTrackInput } from '@/services/tracksAdminApi';
import type { Track } from '@/types/track';

/**
 * Creates a track (property record) in Salesforce. The Real Intelligence feed
 * is cached and eventually consistent, so callers also merge the returned
 * track into TrackContext for immediate selection.
 */
export function useCreateTrack(onCreated?: (track: Track) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTrackInput) => createTrack(input),
    onSuccess: (track) => {
      onCreated?.(track);
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });
}