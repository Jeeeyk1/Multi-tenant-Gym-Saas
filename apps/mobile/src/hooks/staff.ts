import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { staffService } from '../services/staff.service';
import type {
  MemberDetail,
  MembersPage,
  RenewalRecord,
  StaffAnnouncement,
  StaffCheckIn,
} from '../types';

export const staffKeys = {
  all: ['staff'] as const,
  activeCheckIns: (gymId: string | undefined) =>
    [...staffKeys.all, 'checkIns', 'active', gymId] as const,
  members: (gymId: string | undefined, page: number, limit: number) =>
    [...staffKeys.all, 'members', { gymId, page, limit }] as const,
  member: (gymId: string | undefined, memberId: string) =>
    [...staffKeys.all, 'member', gymId, memberId] as const,
  renewals: (gymId: string | undefined, memberId: string) =>
    [...staffKeys.all, 'renewals', gymId, memberId] as const,
  announcements: (gymId: string | undefined, status?: string) =>
    [...staffKeys.all, 'announcements', { gymId, status }] as const,
};

// ── Check-ins ────────────────────────────────────────────────────────────────

export function useActiveCheckIns() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<StaffCheckIn[]>({
    queryKey: staffKeys.activeCheckIns(gymId),
    queryFn: () => staffService.getActiveCheckIns(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useCheckInManual() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.checkInManual(gymId, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.activeCheckIns(gymId) });
    },
  });
}

export function useCheckInQrScan() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (qrCodeToken: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.checkInQrScan(gymId, qrCodeToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.activeCheckIns(gymId) });
    },
  });
}

export function useCheckOut() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkinId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.checkOut(gymId, checkinId);
    },
    onMutate: async (checkinId) => {
      await queryClient.cancelQueries({ queryKey: staffKeys.activeCheckIns(gymId) });
      const previous = queryClient.getQueryData<StaffCheckIn[]>(
        staffKeys.activeCheckIns(gymId),
      );
      queryClient.setQueryData<StaffCheckIn[]>(
        staffKeys.activeCheckIns(gymId),
        (old) => old?.filter((c) => c.id !== checkinId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(staffKeys.activeCheckIns(gymId), context.previous);
      }
    },
  });
}

// ── Members ──────────────────────────────────────────────────────────────────

export function useStaffMembers(page = 1, limit = 200) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MembersPage>({
    queryKey: staffKeys.members(gymId, page, limit),
    queryFn: () => staffService.getMembers(gymId!, page, limit),
    enabled: Boolean(gymId),
  });
}

export function useStaffMember(memberId: string | undefined) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<MemberDetail>({
    queryKey: staffKeys.member(gymId, memberId ?? ''),
    queryFn: () => staffService.getMember(gymId!, memberId!),
    enabled: Boolean(gymId && memberId),
  });
}

export function useStaffRenewals(memberId: string | undefined) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<RenewalRecord[]>({
    queryKey: staffKeys.renewals(gymId, memberId ?? ''),
    queryFn: () => staffService.listRenewals(gymId!, memberId!),
    enabled: Boolean(gymId && memberId),
  });
}

export function useSuspendMember() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.suspendMember(gymId, memberId);
    },
    onSuccess: (_data, memberId) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.member(gymId, memberId) });
      queryClient.invalidateQueries({
        queryKey: [...staffKeys.all, 'members'],
      });
    },
  });
}

export function useReactivateMember() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.reactivateMember(gymId, memberId);
    },
    onSuccess: (_data, memberId) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.member(gymId, memberId) });
      queryClient.invalidateQueries({
        queryKey: [...staffKeys.all, 'members'],
      });
    },
  });
}

export function useRenewMembership(memberId: string) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      amountPaid: number;
      planId?: string;
      paymentMethod?: string;
      notes?: string;
    }) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.renewMembership(gymId, memberId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.member(gymId, memberId) });
      queryClient.invalidateQueries({ queryKey: staffKeys.renewals(gymId, memberId) });
    },
  });
}

// ── Staff announcements ──────────────────────────────────────────────────────

export function useStaffAnnouncements(status?: string) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<StaffAnnouncement[]>({
    queryKey: staffKeys.announcements(gymId, status),
    queryFn: () => staffService.listAnnouncements(gymId!, status),
    enabled: Boolean(gymId),
  });
}

export function useCreateStaffAnnouncement() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      title: string;
      content: string;
      isPinned?: boolean;
      publishAt?: string;
      expiresAt?: string;
    }) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.createAnnouncement(gymId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...staffKeys.all, 'announcements'],
      });
    },
  });
}

export function useArchiveStaffAnnouncement() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return staffService.archiveAnnouncement(gymId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...staffKeys.all, 'announcements'],
      });
    },
  });
}
