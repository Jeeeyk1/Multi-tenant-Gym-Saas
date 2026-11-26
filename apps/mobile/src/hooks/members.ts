import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE } from '../lib/query-client';
import { memberService } from '../services/member.service';
import type {
  CheckIn,
  MemberPrivacy,
  MemberProfile,
  MemberProfileUpdate,
  MembershipRenewal,
  PublicActiveCheckinsResult,
} from '../types';

export const memberKeys = {
  all: ['members'] as const,
  me: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', gymId] as const,
  myProfile: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'profile', gymId] as const,
  myCheckIns: (gymId: string | undefined, limit: number) =>
    [...memberKeys.all, 'me', 'checkins', { gymId, limit }] as const,
  myRenewals: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'renewals', gymId] as const,
  // Not under 'me','checkins': that prefix holds CheckIn[] lists the check-in mutations patch in place.
  myStreak: (gymId: string | undefined) => [...memberKeys.all, 'me', 'streak', gymId] as const,
  activePublicCheckins: (gymId: string | undefined) =>
    [...memberKeys.all, 'active-public-checkins', gymId] as const,
};

export function isNotFound(err: unknown): boolean {
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
    staleTime: STALE.static,
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

export function useMyCheckinStreak() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<{ streak: number }>({
    queryKey: memberKeys.myStreak(gymId),
    queryFn: () => memberService.getMyCheckinStreak(gymId!),
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
    onSuccess: (created) => {
      // Show the new check-in at once (the Check In screen and tab dot read it), then confirm with a refetch.
      queryClient.setQueriesData<CheckIn[]>({ queryKey: [...memberKeys.all, 'me', 'checkins'] }, (prev) =>
        prev ? [created, ...prev] : prev,
      );
      queryClient.invalidateQueries({
        queryKey: [...memberKeys.all, 'me', 'checkins'],
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.myStreak(gymId) });
      // Who's here should include the member straight away.
      queryClient.invalidateQueries({ queryKey: memberKeys.activePublicCheckins(gymId) });
    },
  });
}

export function useSelfCheckOut() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkinId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.selfCheckOut(gymId, checkinId);
    },
    onSuccess: (closed) => {
      queryClient.setQueriesData<CheckIn[]>({ queryKey: [...memberKeys.all, 'me', 'checkins'] }, (prev) =>
        prev?.map((c) => (c.id === closed.id ? { ...c, checkedOutAt: closed.checkedOutAt } : c)),
      );
      queryClient.invalidateQueries({ queryKey: [...memberKeys.all, 'me', 'checkins'] });
      queryClient.invalidateQueries({ queryKey: memberKeys.activePublicCheckins(gymId) });
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

/** Member-facing "who's at the gym" view. Refetches frequently. */
export function useActivePublicCheckins() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<PublicActiveCheckinsResult>({
    queryKey: memberKeys.activePublicCheckins(gymId),
    queryFn: () => memberService.getActivePublicCheckins(gymId!),
    enabled: Boolean(gymId),
    staleTime: STALE.live,
    refetchOnWindowFocus: true,
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
    mutationFn: (data: MemberProfileUpdate) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.updateMyProfile(gymId, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(memberKeys.myProfile(gymId), updated);
    },
  });
}
