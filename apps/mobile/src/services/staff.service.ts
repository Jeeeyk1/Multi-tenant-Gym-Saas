import { api } from './api';
import type { StaffCheckIn, MembersPage, MemberDetail, RenewalRecord, StaffAnnouncement } from '../types';

export const staffService = {
  getActiveCheckIns: (gymId: string) =>
    api.get<StaffCheckIn[]>(`/gyms/${gymId}/checkins/active`),

  checkInManual: (gymId: string, memberId: string) =>
    api.post<StaffCheckIn>(`/gyms/${gymId}/checkins`, {
      method: 'MANUAL_STAFF',
      memberId,
    }),

  checkInQrScan: (gymId: string, qrCodeToken: string) =>
    api.post<StaffCheckIn>(`/gyms/${gymId}/checkins`, {
      method: 'QR_STAFF_SCAN',
      qrCodeToken,
    }),

  checkOut: (gymId: string, checkinId: string) =>
    api.patch<void>(`/gyms/${gymId}/checkins/${checkinId}/checkout`),

  getMembers: (gymId: string, page = 1, limit = 200) =>
    api.get<MembersPage>(`/gyms/${gymId}/members?page=${page}&limit=${limit}`),

  getMember: (gymId: string, memberId: string) =>
    api.get<MemberDetail>(`/gyms/${gymId}/members/${memberId}`),

  suspendMember: (gymId: string, memberId: string) =>
    api.patch<{ id: string; status: string }>(`/gyms/${gymId}/members/${memberId}/suspend`),

  reactivateMember: (gymId: string, memberId: string) =>
    api.patch<{ id: string; status: string }>(`/gyms/${gymId}/members/${memberId}/reactivate`),

  renewMembership: (
    gymId: string,
    memberId: string,
    dto: { amountPaid: number; planId?: string; paymentMethod?: string; notes?: string },
  ) => api.post<{ id: string }>(`/gyms/${gymId}/members/${memberId}/renew`, dto),

  listRenewals: (gymId: string, memberId: string) =>
    api.get<RenewalRecord[]>(`/gyms/${gymId}/members/${memberId}/renewals`),

  listAnnouncements: (gymId: string, status?: string) =>
    api.get<StaffAnnouncement[]>(
      `/gyms/${gymId}/announcements${status ? `?status=${status}` : ''}`,
    ),

  createAnnouncement: (
    gymId: string,
    dto: {
      title: string;
      content: string;
      isPinned?: boolean;
      publishAt?: string;
      expiresAt?: string;
    },
  ) => api.post<StaffAnnouncement>(`/gyms/${gymId}/announcements`, dto),

  archiveAnnouncement: (gymId: string, id: string) =>
    api.delete<StaffAnnouncement>(`/gyms/${gymId}/announcements/${id}`),

  updateAnnouncement: (
    gymId: string,
    id: string,
    dto: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      publishAt?: string | null;
      expiresAt?: string | null;
    },
  ) => api.patch<StaffAnnouncement>(`/gyms/${gymId}/announcements/${id}`, dto),
};
