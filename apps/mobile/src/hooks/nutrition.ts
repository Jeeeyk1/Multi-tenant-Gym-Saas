import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/ai.service';
import { useMyMember } from './members';
import { fitnessPlanKeys } from './fitness-plan';
import type { FoodLog, MealAnalysis, MealPlan, MealStyle } from '../types';

export const nutritionKeys = {
  all: ['nutrition'] as const,
  foodLogs: (gymId: string | undefined, memberId: string | undefined, date: string | undefined) =>
    [...nutritionKeys.all, 'food-logs', gymId, memberId, date ?? 'today'] as const,
  aiUsage: (gymId: string | undefined, memberId: string | undefined) =>
    [...nutritionKeys.all, 'ai-usage', gymId, memberId] as const,
  recent: (gymId: string | undefined, memberId: string | undefined) =>
    [...nutritionKeys.all, 'food-logs', 'recent', gymId, memberId] as const,
};

function useIds() {
  const { user } = useAuth();
  const { data: member } = useMyMember();
  return { gymId: user?.gymId, memberId: member?.id };
}

/** One day's food log (YYYY-MM-DD, gym timezone). */
export function useFoodLogs(date: string | undefined) {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: nutritionKeys.foodLogs(gymId, memberId, date),
    queryFn: () => aiService.listFoodLogs(gymId!, memberId!, 100, date),
    enabled: Boolean(gymId && memberId && date),
  });
}

/** Distinct recent meals (newest first) for one-tap re-logging. No AI involved. */
export function useRecentFoods(max = 6) {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: nutritionKeys.recent(gymId, memberId),
    queryFn: () => aiService.listFoodLogs(gymId!, memberId!, 40),
    enabled: Boolean(gymId && memberId),
    select: (logs: FoodLog[]) => {
      const seen = new Set<string>();
      return logs
        .filter((l) => {
          const key = l.description.trim().toLowerCase();
          if (seen.has(key) || l.calories === null) return false;
          seen.add(key);
          return true;
        })
        .slice(0, max);
    },
  });
}

export function useAiUsage() {
  const { gymId, memberId } = useIds();
  return useQuery({
    queryKey: nutritionKeys.aiUsage(gymId, memberId),
    queryFn: () => aiService.getUsage(gymId!, memberId!),
    enabled: Boolean(gymId && memberId),
  });
}

function useRefreshAfterAi() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [...nutritionKeys.all, 'ai-usage'] });
}

/** AI estimate of a typed meal. Counts toward the monthly typed-meal limit. */
export function useAnalyseMeal() {
  const { gymId, memberId } = useIds();
  const refreshUsage = useRefreshAfterAi();
  return useMutation({
    mutationFn: (description: string): Promise<MealAnalysis> =>
      aiService.analyseMeal(gymId!, memberId!, { description }),
    onSettled: refreshUsage,
  });
}

/** AI estimate of a meal photo (upload, then analyse). Counts toward the monthly photo limit. */
export function useAnalyseMealPhoto() {
  const { gymId, memberId } = useIds();
  const refreshUsage = useRefreshAfterAi();
  return useMutation({
    mutationFn: async (photoUri: string): Promise<MealAnalysis> => {
      const { url } = await aiService.uploadFoodPhoto(gymId!, memberId!, photoUri);
      return aiService.analyseMeal(gymId!, memberId!, { photoUrl: url });
    },
    onSettled: refreshUsage,
  });
}

/** One meal that fits what is left of today's plan. Counts toward the meal-suggestion limit. */
export function useMealIdea() {
  const { gymId, memberId } = useIds();
  const refreshUsage = useRefreshAfterAi();
  return useMutation({
    mutationFn: async (style?: MealStyle): Promise<MealPlan> => {
      const res = await aiService.getMealSuggestion(gymId!, memberId!, { mode: 'SINGLE_MEAL', style });
      return JSON.parse(res.suggestion) as MealPlan;
    },
    onSettled: refreshUsage,
  });
}

const oneDecimal = (n: number | undefined) => (n === undefined ? undefined : Math.round(n * 10) / 10);

export function useLogFood() {
  const { gymId, memberId } = useIds();
  const queryClient = useQueryClient();
  return useMutation({
    // The API takes whole calories and macros with at most one decimal; AI estimates
    // and typed values can have more, so round here once for every caller.
    mutationFn: (data: { description: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number }) =>
      aiService.logFood(gymId!, memberId!, {
        description: data.description,
        calories: data.calories === undefined ? undefined : Math.round(data.calories),
        proteinG: oneDecimal(data.proteinG),
        carbsG: oneDecimal(data.carbsG),
        fatG: oneDecimal(data.fatG),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...nutritionKeys.all, 'food-logs'] });
      queryClient.invalidateQueries({ queryKey: [...fitnessPlanKeys.all, 'daily'] });
    },
  });
}
