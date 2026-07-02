'use server';

import { api } from '@/lib/api';
import type { CheckinsTrendPoint } from '@/types/api';

export async function getCheckinsTrend(
  gymId: string,
  days: 7 | 30,
): Promise<CheckinsTrendPoint[]> {
  return api.get<CheckinsTrendPoint[]>(`/gyms/${gymId}/reports/checkins-trend?days=${days}`);
}
