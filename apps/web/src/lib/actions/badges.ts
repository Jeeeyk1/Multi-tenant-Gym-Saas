'use server';

import { revalidatePath } from 'next/cache';
import type { BadgeCategory } from '@gym-saas/contracts';
import { api } from '@/lib/api';
import type { LadderWeights } from '@/types/api';

export async function createCustomBadge(
  gymId: string,
  data: { name: string; description?: string; icon: string; color: string; category: BadgeCategory },
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

/** Turns a lift's bronze/silver/gold ladder on (with these weights) or off. */
export async function saveLadder(
  gymId: string,
  exerciseId: string,
  data: { enabled: true; weights: LadderWeights } | { enabled: false },
): Promise<{ error?: string }> {
  try {
    const body = data.enabled
      ? { enabled: true, bronzeKg: data.weights.BRONZE, silverKg: data.weights.SILVER, goldKg: data.weights.GOLD }
      : { enabled: false };
    await api.put(`/gyms/${gymId}/badges/ladders/${exerciseId}`, body);
    revalidatePath('/dashboard/badges');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to save the ladder.' };
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
