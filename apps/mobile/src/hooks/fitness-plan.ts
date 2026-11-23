import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE } from '../lib/query-client';
import { fitnessPlanService } from '../services/fitness-plan.service';
import { useMyMember } from './members';

export const fitnessPlanKeys = {
  all: ['fitness-plan'] as const,
  options: (memberId: string | undefined) => [...fitnessPlanKeys.all, 'options', memberId] as const,
  current: (memberId: string | undefined) => [...fitnessPlanKeys.all, 'current', memberId] as const,
  daily: (memberId: string | undefined, date: string | undefined) =>
    [...fitnessPlanKeys.all, 'daily', memberId, date ?? 'today'] as const,
};

function useIds() {
  const { user } = useAuth();
  const { data: member } = useMyMember();
  return { gymId: user?.gymId, memberId: member?.id };
}

/**
 * Pace options calculated from the saved profile. Pass `enabled: false` until the
 * profile and consent have been saved, otherwise the API answers 422.
 */
export function useFitnessPlanOptions(enabled = true) {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.options(memberId),
    queryFn: () => fitnessPlanService.getOptions(gymId!, memberId!),
    enabled: enabled && Boolean(gymId && memberId),
    // Always recalculate from the latest profile answers.
    staleTime: 0,
  });
}

export function useCurrentFitnessPlan() {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.current(memberId),
    queryFn: async () => (await fitnessPlanService.getCurrent(gymId!, memberId!)).plan,
    enabled: Boolean(gymId && memberId),
    staleTime: STALE.static,
  });
}

export function useSaveFitnessPlan() {
  const { gymId, memberId } = useIds();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pace?: string) => fitnessPlanService.save(gymId!, memberId!, pace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessPlanKeys.all });
    },
  });
}

/** Eaten vs targets for a day (YYYY-MM-DD, gym timezone). Omit for today. */
export function useDailyNutrition(date?: string) {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.daily(memberId, date),
    queryFn: () => fitnessPlanService.getDailyNutrition(gymId!, memberId!, date),
    enabled: Boolean(gymId && memberId),
  });
}
