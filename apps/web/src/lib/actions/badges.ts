'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createCustomBadge(
  gymId: string,
  data: { name: string; description?: string; icon: string; color: string },
): Promise<{ error?: string }> {
  try {
    await api.post(`/gyms/${gymId}/badges/custom`, data);
    revalidatePath('/dashboard/badges');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to create custom badge.' };
  }
}

export async function createMilestoneBadge(
  gymId: string,
  data: {
    exerciseId: string;
    badgeName: string;
    description?: string;
    weightKg: number;
    icon: string;
    color: string;
  },
): Promise<{ error?: string }> {
  try {
    await api.post(`/gyms/${gymId}/badges/milestone`, data);
    revalidatePath('/dashboard/badges');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to create milestone badge.' };
  }
}

export async function awardBadge(
  gymId: string,
  memberId: string,
  data: { customBadgeId: string; proofUrl?: string; proofNotes?: string },
): Promise<{ error?: string }> {
  try {
    await api.post(`/gyms/${gymId}/badges/award`, { memberId, ...data });
    revalidatePath(`/dashboard/members/${memberId}`);
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to award badge.' };
  }
}
