import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { STALE } from '../lib/query-client';
import { fitnessPlanService } from '../services/fitness-plan.service';
import { memberKeys, useMyMember } from './members';

export const fitnessPlanKeys = {
  all: ['fitness-plan'] as const,
  options: (gymId: string | undefined, memberId: string | undefined) =>
    [...fitnessPlanKeys.all, 'options', gymId, memberId] as const,
  current: (gymId: string | undefined, memberId: string | undefined) =>
    [...fitnessPlanKeys.all, 'current', gymId, memberId] as const,
  daily: (gymId: string | undefined, memberId: string | undefined, date: string | undefined) =>
    [...fitnessPlanKeys.all, 'daily', gymId, memberId, date ?? 'today'] as const,
  weights: (gymId: string | undefined, memberId: string | undefined) =>
    [...fitnessPlanKeys.all, 'weights', gymId, memberId] as const,
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
    queryKey: fitnessPlanKeys.options(gymId, memberId),
    queryFn: () => fitnessPlanService.getOptions(gymId!, memberId!),
    enabled: enabled && Boolean(gymId && memberId),
    // Always recalculate from the latest profile answers.
    staleTime: 0,
  });
}

export function useCurrentFitnessPlan() {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.current(gymId, memberId),
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
      // Options depend on the profile, not on the saved plan, so they stay as they are.
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'current'] });
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'daily'] });
    },
  });
}

/** Eaten vs targets for a day (YYYY-MM-DD, gym timezone). Omit for today. */
export function useDailyNutrition(date?: string) {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.daily(gymId, memberId, date),
    queryFn: () => fitnessPlanService.getDailyNutrition(gymId!, memberId!, date),
    enabled: Boolean(gymId && memberId),
  });
}

export function useWeightLogs() {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: fitnessPlanKeys.weights(gymId, memberId),
    queryFn: () => fitnessPlanService.getWeightLogs(gymId!, memberId!),
    enabled: Boolean(gymId && memberId),
  });
}

/** Log a weigh-in; refreshes the plan, today's targets and the weight history. */
export function useWeighIn() {
  const { gymId, memberId } = useIds();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weightKg: number) => fitnessPlanService.weighIn(gymId!, memberId!, weightKg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'current'] });
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'daily'] });
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'weights'] });
      // The API also writes the new weight to the profile; refresh it so screens that
      // prefill from the profile (e.g. onboarding) don't send the old weight back.
      queryClient.invalidateQueries({ queryKey: memberKeys.myProfile(gymId) });
    },
  });
}
