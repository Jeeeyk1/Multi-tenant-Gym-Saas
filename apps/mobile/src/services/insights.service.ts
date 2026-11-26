import { api } from './api';
import type { AiUsageView, InsightsResult, InsightsHistoryTurn } from '../types';

export const insightsService = {
  query: (gymId: string, message: string, history: InsightsHistoryTurn[]) =>
    api.post<InsightsResult>(`/gyms/${gymId}/insights/query`, { message, history }),
  usage: (gymId: string) => api.get<AiUsageView>(`/gyms/${gymId}/insights/usage`),
};
