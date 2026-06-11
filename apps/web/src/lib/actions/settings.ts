'use server';

import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import type { GymDetail, GymProfile } from '@/types/api';

export async function getGymDetail(): Promise<GymDetail> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not authenticated');
  return api.get<GymDetail>(`/gyms/${user.gymId}/detail`);
}

export async function updateGymProfile(
  gymId: string,
  data: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    facebookUrl?: string;
    instagramUrl?: string;
  },
): Promise<GymProfile> {
  return api.patch<GymProfile>(`/gyms/${gymId}/profile`, data);
}
