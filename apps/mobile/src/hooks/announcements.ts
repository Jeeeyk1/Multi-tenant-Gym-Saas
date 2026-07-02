import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { announcementService } from '../services/announcement.service';
import type { Announcement } from '../types';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (gymId: string | undefined) =>
    [...announcementKeys.all, 'list', gymId] as const,
};

export function useAnnouncements() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<Announcement[]>({
    queryKey: announcementKeys.list(gymId),
    queryFn: () => announcementService.list(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useMarkAnnouncementRead() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return announcementService.markRead(gymId, announcementId);
    },
    onMutate: async (announcementId) => {
      await queryClient.cancelQueries({ queryKey: announcementKeys.list(gymId) });
      const previous = queryClient.getQueryData<Announcement[]>(announcementKeys.list(gymId));
      queryClient.setQueryData<Announcement[]>(
        announcementKeys.list(gymId),
        (old) =>
          old?.map((a) =>
            a.id === announcementId ? { ...a, readAt: new Date().toISOString() } : a,
          ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(announcementKeys.list(gymId), context.previous);
      }
    },
  });
}
