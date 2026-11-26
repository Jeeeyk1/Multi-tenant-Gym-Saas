import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { workoutService } from '../services/workout.service';
import type { WorkoutSession, WorkoutSessionsPage, WorkoutSummary } from '../types';

export const workoutKeys = {
  all: ['workouts'] as const,
  sessions: (gymId: string | undefined, limit: number) =>
    [...workoutKeys.all, 'sessions', { gymId, limit }] as const,
  summary: (gymId: string | undefined) => [...workoutKeys.all, 'summary', gymId] as const,
};

const PAGE_SIZE = 20;

export function useWorkoutSessions(limit = PAGE_SIZE) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useInfiniteQuery<WorkoutSessionsPage>({
    queryKey: workoutKeys.sessions(gymId, limit),
    queryFn: ({ pageParam = 1 }) =>
      workoutService.listSessions(gymId!, pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
    enabled: Boolean(gymId),
  });
}

/** All-time totals, computed by the API (the session list is paged, so it can't be summed here). */
export function useWorkoutSummary() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<WorkoutSummary>({
    queryKey: workoutKeys.summary(gymId),
    queryFn: () => workoutService.getSummary(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useLogWorkoutSession() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation<
    WorkoutSession,
    Error,
    {
      workoutType: string;
      startedAt: string;
      endedAt: string;
      durationMinutes: number;
      caloriesBurned?: number;
      avgHeartRate?: number;
      notes?: string;
    }
  >({
    mutationFn: (data) => {
      if (!gymId) throw new Error('Not authenticated');
      return workoutService.logSession(gymId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}
