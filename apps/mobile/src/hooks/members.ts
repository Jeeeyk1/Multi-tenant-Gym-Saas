import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/member.service';
import type {
  CheckIn,
  EquippedBadgeRow,
  MemberBadge,
  MemberPrivacy,
  MemberProfile,
  MembershipRenewal,
  PublicActiveCheckinsResult,
} from '../types';

export const memberKeys = {
  all: ['members'] as const,
  me: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', gymId] as const,
  myProfile: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'profile', gymId] as const,
  myBadges: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'badges', gymId] as const,
  myCheckIns: (gymId: string | undefined, limit: number) =>
    [...memberKeys.all, 'me', 'checkins', { gymId, limit }] as const,
  myRenewals: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'renewals', gymId] as const,
  equippedBadges: (gymId: string | undefined) =>
    [...memberKeys.all, 'equipped-badges', gymId] as const,
  activePublicCheckins: (gymId: string | undefined) =>
    [...memberKeys.all, 'active-public-checkins', gymId] as const,
};

function isNotFound(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 404;
}

export function useMyMember() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery({
    queryKey: memberKeys.me(gymId),
    queryFn: () => memberService.getMyMember(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useMyProfile() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MemberProfile | null>({
    queryKey: memberKeys.myProfile(gymId),
    queryFn: async () => {
      try {
        return await memberService.getMyProfile(gymId!);
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    enabled: Boolean(gymId),
  });
}

export function useMyBadges() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MemberBadge[]>({
    queryKey: memberKeys.myBadges(gymId),
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

export function useMyCheckIns(limit = 7) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<CheckIn[]>({
    queryKey: memberKeys.myCheckIns(gymId, limit),
    queryFn: () => memberService.getMyCheckIns(gymId!, limit),
    enabled: Boolean(gymId),
  });
}

export function useSelfCheckIn() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation<CheckIn, Error, void>({
    mutationFn: () => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.selfCheckIn(gymId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...memberKeys.all, 'me', 'checkins'],
      });
    },
  });
}

export function useMyRenewals() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MembershipRenewal[]>({
    queryKey: memberKeys.myRenewals(gymId),
    queryFn: () => memberService.getMyRenewals(gymId!),
    enabled: Boolean(gymId),
  });
}

/**
 * Returns a Map<userId, EquippedBadge> for all members in the gym who have
 * a badge equipped. Used by chat and leaderboard to show badges next to names.
 */
export function useEquippedBadgesMap() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery({
    queryKey: memberKeys.equippedBadges(gymId),
    queryFn: async () => {
      const rows: EquippedBadgeRow[] = await memberService.getEquippedBadges(gymId!);
      const map = new Map<string, EquippedBadgeRow['badge']>();
      for (const row of rows) map.set(row.userId, row.badge);
      return map;
    },
    enabled: Boolean(gymId),
    staleTime: 60_000,
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
      queryClient.invalidateQueries({ queryKey: memberKeys.myBadges(gymId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.equippedBadges(gymId) });
    },
  });
}

/** Member-facing "who's at the gym" view. Refetches frequently. */
export function useActivePublicCheckins() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<PublicActiveCheckinsResult>({
    queryKey: memberKeys.activePublicCheckins(gymId),
    queryFn: () => memberService.getActivePublicCheckins(gymId!),
    enabled: Boolean(gymId),
    staleTime: 30_000,
  });
}

export function useUpdateMyPrivacy() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<MemberPrivacy>) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.updateMyPrivacy(gymId, patch);
    },
    onSuccess: (updated) => {
      // Patch the cached GymMember so privacy state stays consistent.
      queryClient.setQueryData<{ privacy?: MemberPrivacy | null }>(memberKeys.me(gymId), (prev) =>
        prev ? { ...prev, privacy: updated } : prev,
      );
      queryClient.invalidateQueries({ queryKey: memberKeys.activePublicCheckins(gymId) });
    },
  });
}

export function useUpdateMyProfile() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Omit<MemberProfile, 'id' | 'memberId'>>) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.updateMyProfile(gymId, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(memberKeys.myProfile(gymId), updated);
    },
  });
}
