'use server';

import { api } from '@/lib/api';
import type { InsightsResult } from '@/types/api';

export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function queryInsights(
  gymId: string,
  message: string,
  history: HistoryTurn[],
): Promise<{ data?: InsightsResult; error?: string }> {
  try {
    const data = await api.post<InsightsResult>(`/gyms/${gymId}/insights/query`, {
      message,
      history,
    });
    return { data };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Something went wrong. Please try again.' };
  }
}
