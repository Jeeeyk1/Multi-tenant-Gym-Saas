import { api } from './api';
import type { CustomBadge } from '../types';

export const badgesService = {
  listCustom: (gymId: string) =>
    api.get<CustomBadge[]>(`/gyms/${gymId}/badges/custom`),

  award: (gymId: string, dto: { memberId: string; customBadgeId: string; proofNotes?: string }) =>
    api.post<{ id: string }>(`/gyms/${gymId}/badges/award`, dto),
};
