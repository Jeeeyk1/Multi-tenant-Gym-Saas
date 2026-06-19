'use server';

import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import type { GymDetail, GymProfile } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function uploadGymLogo(gymId: string, formData: FormData): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/gyms/${gymId}/profile/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Logo upload failed');
  }

  const json = await res.json() as { url: string };
  return json.url;
}

export async function getGymDetail(): Promise<GymDetail> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not authenticated');
  return api.get<GymDetail>(`/gyms/${user.gymId}/detail`);
}

export async function updateGymSchedules(
  gymId: string,
  schedules: { dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[],
): Promise<void> {
  await api.patch(`/gyms/${gymId}/schedules`, { schedules });
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
