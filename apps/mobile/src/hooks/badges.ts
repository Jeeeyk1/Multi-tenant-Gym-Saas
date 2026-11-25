import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE } from '../lib/query-client';
import { badgesService } from '../services/badges.service';
import { memberKeys, useMyMember } from './members';
import type { CustomBadge } from '../types';

export const badgesKeys = {
  all: ['badges'] as const,
  custom: (gymId: string | undefined) => [...badgesKeys.all, 'custom', gymId] as const,
  collection: (gymId: string | undefined, memberId: string | undefined) =>
    [...badgesKeys.all, 'collection', gymId, memberId] as const,
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

/** Every badge the gym offers, earned or locked, for the signed-in member. */
export function useBadgeCollection() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const { data: member } = useMyMember();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: badgesKeys.collection(gymId, member?.id),
    queryFn: () => badgesService.getCollection(gymId!, member!.id),
    enabled: Boolean(gymId && member?.id),
  });
  // Loading the collection can award badges the member already qualifies for.
  const { dataUpdatedAt } = query;
  useEffect(() => {
    if (dataUpdatedAt > 0) queryClient.invalidateQueries({ queryKey: memberKeys.myBadges(gymId) });
  }, [dataUpdatedAt, gymId, queryClient]);
  return query;
}

export function useMarkBadgesSeen() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (badgeIds: string[]) => badgesService.markSeen(gymId!, badgeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.myBadges(gymId) });
      queryClient.invalidateQueries({ queryKey: [...badgesKeys.all, 'collection'] });
    },
  });
}
