import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE, queryClient as appQueryClient } from '../lib/query-client';
import { badgesService } from '../services/badges.service';
import { memberService } from '../services/member.service';
import { isNotFound, useMyMember } from './members';
import type { CustomBadge, EquippedBadgeRow, MemberBadge } from '../types';

const EQUIPPED_STALE_MS = 60_000;

export const badgesKeys = {
  all: ['badges'] as const,
  custom: (gymId: string | undefined) => [...badgesKeys.all, 'custom', gymId] as const,
  mine: (gymId: string | undefined) => [...badgesKeys.all, 'mine', gymId] as const,
  equipped: (gymId: string | undefined) => [...badgesKeys.all, 'equipped', gymId] as const,
  collections: () => [...badgesKeys.all, 'collection'] as const,
  collection: (gymId: string | undefined, memberId: string | undefined) =>
    [...badgesKeys.collections(), gymId, memberId] as const,
};

/** The signed-in member's earned badges. */
export function useMyBadges() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MemberBadge[]>({
    queryKey: badgesKeys.mine(gymId),
    queryFn: async () => {
      try {
        return await memberService.getMyBadges(gymId!);
      } catch (err) {
        if (isNotFound(err)) return [];
        throw err;
      }
    },
    enabled: Boolean(gymId),
  });
}

/** Equipped badges (up to three) per user id, for showing next to names in chat, leaderboard and Who's Here. */
export function useEquippedBadgesMap() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery({
    queryKey: badgesKeys.equipped(gymId),
    queryFn: async () => {
      const rows: EquippedBadgeRow[] = await memberService.getEquippedBadges(gymId!);
      return new Map(rows.map((row) => [row.userId, row.badges]));
    },
    enabled: Boolean(gymId),
    staleTime: EQUIPPED_STALE_MS,
  });
}

export function useEquipBadge() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ badgeId, equipped }: { badgeId: string; equipped: boolean }) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.equipBadge(gymId, badgeId, equipped);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgesKeys.mine(gymId) });
      queryClient.invalidateQueries({ queryKey: badgesKeys.equipped(gymId) });
      queryClient.invalidateQueries({ queryKey: badgesKeys.collections() });
    },
  });
}

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
  return useQuery({
    queryKey: badgesKeys.collection(gymId, member?.id),
    queryFn: async () => {
      const collection = await badgesService.getCollection(gymId!, member!.id);
      // Loading the collection can award badges the member already qualifies for.
      appQueryClient.invalidateQueries({ queryKey: badgesKeys.mine(gymId) });
      return collection;
    },
    enabled: Boolean(gymId && member?.id),
  });
}

export function useMarkBadgesSeen() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (badgeIds: string[]) => badgesService.markSeen(gymId!, badgeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgesKeys.mine(gymId) });
      queryClient.invalidateQueries({ queryKey: badgesKeys.collections() });
    },
  });
}
