import { api } from './api';
import type { GymMember, CheckIn, MemberProfile, MemberBadge } from '../types';

export const memberService = {
  getMyMember: (gymId: string) =>
    api.get<GymMember>(`/gyms/${gymId}/members/me`),

  getMyCheckIns: (gymId: string, limit = 7) =>
    api.get<CheckIn[]>(`/gyms/${gymId}/checkins/me?limit=${limit}`),

  selfCheckIn: (gymId: string) =>
    api.post<CheckIn>(`/gyms/${gymId}/checkins`, { method: 'APP_SELF_CHECKIN' }),

  getMyProfile: (gymId: string) =>
    api.get<MemberProfile>(`/gyms/${gymId}/members/me/profile`),

  updateMyProfile: (gymId: string, data: Partial<Omit<MemberProfile, 'id' | 'memberId'>>) =>
    api.patch<MemberProfile>(`/gyms/${gymId}/members/me/profile`, data),

  registerDeviceToken: (gymId: string, token: string, platform: 'ios' | 'android') =>
    api.post<void>(`/gyms/${gymId}/members/me/device-token`, { token, platform }),

  getMyBadges: (gymId: string) =>
    api.get<MemberBadge[]>(`/gyms/${gymId}/badges/my`),
};
