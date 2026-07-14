import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE } from '../lib/query-client';
import { badgesService } from '../services/badges.service';
import type { CustomBadge } from '../types';

export const badgesKeys = {
  all: ['badges'] as const,
  custom: (gymId: string | undefined) => [...badgesKeys.all, 'custom', gymId] as const,
};

export function useCustomBadges() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<CustomBadge[]>({
    queryKey: badgesKeys.custom(gymId),
    queryFn: () => badgesService.listCustom(gymId!),
    enabled: Boolean(gymId),
    staleTime: STALE.static,
  });
}

export function useAwardBadge() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { memberId: string; customBadgeId: string; proofNotes?: string }) => {
      if (!gymId) throw new Error('Not authenticated');
      return badgesService.award(gymId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgesKeys.custom(gymId) });
    },
  });
}
