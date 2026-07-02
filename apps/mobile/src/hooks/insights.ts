import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { insightsService } from '../services/insights.service';
import type { InsightsHistoryTurn } from '../types';

export function useInsightsQuery() {
  const { user } = useAuth();
  const gymId = user?.gymId;

  return useMutation({
    mutationFn: (vars: { message: string; history: InsightsHistoryTurn[] }) => {
      if (!gymId) throw new Error('Not authenticated');
      return insightsService.query(gymId, vars.message, vars.history);
    },
  });
}
