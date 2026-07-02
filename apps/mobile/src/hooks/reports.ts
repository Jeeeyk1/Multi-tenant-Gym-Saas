import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../services/reports.service';
import type { CheckinsTrendPoint } from '../types';

export const reportsKeys = {
  all: ['reports'] as const,
  checkinsTrend: (gymId: string | undefined, days: 7 | 30) =>
    [...reportsKeys.all, 'checkinsTrend', gymId, days] as const,
};

export function useCheckinsTrend(days: 7 | 30) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const canViewReports = user?.permissions.includes('reports.view') ?? false;

  return useQuery<CheckinsTrendPoint[]>({
    queryKey: reportsKeys.checkinsTrend(gymId, days),
    queryFn: () => reportsService.getCheckinsTrend(gymId!, days),
    enabled: Boolean(gymId) && canViewReports,
  });
}
