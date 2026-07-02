import { api } from './api';
import type {
  GymMember,
  CheckIn,
  MemberProfile,
  MemberBadge,
  MembershipRenewal,
  EquippedBadgeRow,
  MemberPrivacy,
  PublicActiveCheckinsResult,
} from '../types';

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

  getMyRenewals: (gymId: string) =>
    api.get<MembershipRenewal[]>(`/gyms/${gymId}/members/me/renewals`),

  getEquippedBadges: (gymId: string) =>
    api.get<EquippedBadgeRow[]>(`/gyms/${gymId}/badges/equipped`),

  equipBadge: (gymId: string, badgeId: string, equipped: boolean) =>
    api.patch<void>(`/gyms/${gymId}/badges/my/${badgeId}`, { equipped }),

  getActivePublicCheckins: (gymId: string) =>
    api.get<PublicActiveCheckinsResult>(`/gyms/${gymId}/checkins/active-public`),

  updateMyPrivacy: (gymId: string, patch: Partial<MemberPrivacy>) =>
    api.patch<MemberPrivacy>(`/gyms/${gymId}/members/me/privacy`, patch),
};
