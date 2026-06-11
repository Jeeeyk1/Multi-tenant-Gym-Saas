'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function approveSubmission(
  gymId: string,
  submissionId: string,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/gyms/${gymId}/leaderboard/submissions/${submissionId}/approve`, {});
    revalidatePath('/dashboard/leaderboard/pending');
    revalidatePath('/dashboard/leaderboard');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to approve submission.' };
  }
}

export async function rejectSubmission(
  gymId: string,
  submissionId: string,
  reason: string,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/gyms/${gymId}/leaderboard/submissions/${submissionId}/reject`, { reason });
    revalidatePath('/dashboard/leaderboard/pending');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to reject submission.' };
  }
}

export async function updateLeaderboardConfig(
  gymId: string,
  exercises: { exerciseId: string; isActive: boolean; displayOrder: number }[],
): Promise<{ error?: string }> {
  try {
    await api.put(`/gyms/${gymId}/leaderboard/config`, { exercises });
    revalidatePath('/dashboard/leaderboard/config');
    revalidatePath('/dashboard/leaderboard');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to update config.' };
  }
}
