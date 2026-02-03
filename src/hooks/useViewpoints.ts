import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchViewpoints, 
  createViewpoint, 
  updateViewpoint, 
  deleteViewpoint 
} from '@/services/viewpointsApi';
import type { ViewpointFormData } from '@/types/viewpoint';

// Query key factory
const viewpointKeys = {
  all: ['viewpoints'] as const,
  byVenue: (venueId: string) => ['viewpoints', venueId] as const,
};

// Fetch viewpoints for a venue
export function useViewpoints(venueId: string | undefined) {
  return useQuery({
    queryKey: viewpointKeys.byVenue(venueId || ''),
    queryFn: () => fetchViewpoints(venueId!),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create a new viewpoint
export function useCreateViewpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ venueId, data }: { venueId: string; data: ViewpointFormData }) =>
      createViewpoint(venueId, data),
    onSuccess: (_, { venueId }) => {
      queryClient.invalidateQueries({ queryKey: viewpointKeys.byVenue(venueId) });
    },
  });
}

// Update an existing viewpoint
export function useUpdateViewpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ViewpointFormData> }) =>
      updateViewpoint(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: viewpointKeys.all });
    },
  });
}

// Delete a viewpoint
export function useDeleteViewpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteViewpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: viewpointKeys.all });
    },
  });
}
