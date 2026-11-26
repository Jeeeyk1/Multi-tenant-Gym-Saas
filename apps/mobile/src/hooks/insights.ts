import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { insightsService } from '../services/insights.service';
import type { AiUsageView, InsightsHistoryTurn } from '../types';

export const insightsKeys = {
  all: ['insights'] as const,
  usage: (gymId: string | undefined) => [...insightsKeys.all, 'usage', gymId] as const,
};

/** This month's AI allowance and the caller's questions today, for the meter. */
export function useAiUsage() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<AiUsageView>({
    queryKey: insightsKeys.usage(gymId),
    queryFn: () => insightsService.usage(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useInsightsQuery() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { message: string; history: InsightsHistoryTurn[] }) => {
      if (!gymId) throw new Error('Not authenticated');
      return insightsService.query(gymId, vars.message, vars.history);
    },
    // Every answer, and every limit error, changes the meter.
    onSettled: () => queryClient.invalidateQueries({ queryKey: insightsKeys.usage(gymId) }),
  });
}
