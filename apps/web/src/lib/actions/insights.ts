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

/** Runs an action the assistant proposed. The API makes sure it's this user's and runs it once. */
export async function confirmInsightsAction(gymId: string, actionId: string): Promise<{ message?: string; error?: string }> {
  try {
    const { message } = await api.post<{ ok: true; message: string }>(`/gyms/${gymId}/insights/actions/${actionId}/confirm`);
    return { message };
  } catch (err: unknown) {
    return { error: formatApiError(err, 'That action could not be completed. Please try again.') };
  }
}

/** Best effort: an action that isn't confirmed expires on its own anyway. */
export async function cancelInsightsAction(gymId: string, actionId: string): Promise<void> {
  try {
    await api.post(`/gyms/${gymId}/insights/actions/${actionId}/cancel`);
  } catch {
    // Nothing to do: it expires in a few minutes.
  }
}
