import { api } from './api';
import type { CheckinsTrendPoint } from '../types';

export const reportsService = {
  getCheckinsTrend: (gymId: string, days: 7 | 30) =>
    api.get<CheckinsTrendPoint[]>(`/gyms/${gymId}/reports/checkins-trend?days=${days}`),
};
