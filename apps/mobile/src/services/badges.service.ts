import { api } from './api';
import type { BadgeCollection, CustomBadge } from '../types';

export const badgesService = {
  listCustom: (gymId: string) =>
    api.get<CustomBadge[]>(`/gyms/${gymId}/badges/custom`),

  award: (gymId: string, dto: { memberId: string; customBadgeId: string; proofNotes?: string }) =>
    api.post<{ id: string }>(`/gyms/${gymId}/badges/award`, dto),

  getCollection: (gymId: string, memberId: string) =>
    api.get<BadgeCollection>(`/gyms/${gymId}/members/${memberId}/badges/collection`),

  /** The member has seen the "new badge" celebration for these member-badge ids. */
  markSeen: (gymId: string, badgeIds: string[]) =>
    api.post<void>(`/gyms/${gymId}/badges/my/seen`, { badgeIds }),
};
