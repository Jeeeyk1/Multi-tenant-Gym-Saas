'use server';

import { api } from '@/lib/api';
import { formatApiError } from '@/lib/format-error';
import type { AiUsageView, InsightsResult } from '@/types/api';

export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Errors that mean "you can't ask again until the allowance resets", so the input should pause. */
export type InsightsLimitCode = 'AI_ALLOWANCE_EXCEEDED' | 'AI_DAILY_LIMIT_REACHED' | 'FEATURE_NOT_AVAILABLE';
const LIMIT_CODES: readonly string[] = ['AI_ALLOWANCE_EXCEEDED', 'AI_DAILY_LIMIT_REACHED', 'FEATURE_NOT_AVAILABLE'];

export async function queryInsights(
  gymId: string,
  message: string,
  history: HistoryTurn[],
): Promise<{ data?: InsightsResult; error?: string; limit?: InsightsLimitCode }> {
  try {
    const data = await api.post<InsightsResult>(`/gyms/${gymId}/insights/query`, {
      message,
      history,
    });
    return { data };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    return {
      error: formatApiError(err, 'Something went wrong. Please try again.'),
      limit: code && LIMIT_CODES.includes(code) ? (code as InsightsLimitCode) : undefined,
    };
  }
}

/** For refreshing the usage meter after each answer. Null if it can't be loaded. */
export async function getAiUsage(gymId: string): Promise<AiUsageView | null> {
  try {
    return await api.get<AiUsageView>(`/gyms/${gymId}/insights/usage`);
  } catch {
    return null;
  }
}
