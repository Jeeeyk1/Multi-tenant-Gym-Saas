import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { leaderboardService } from '../services/leaderboard.service';
import type {
  Exercise,
  LeaderboardConfigItem,
  LeaderboardExerciseResult,
  PrSubmission,
} from '../types';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  board: (gymId: string | undefined) =>
    [...leaderboardKeys.all, 'board', gymId] as const,
  exercises: (gymId: string | undefined) =>
    [...leaderboardKeys.all, 'exercises', gymId] as const,
  myPrs: (gymId: string | undefined) =>
    [...leaderboardKeys.all, 'myPrs', gymId] as const,
  pending: (gymId: string | undefined) =>
    [...leaderboardKeys.all, 'pending', gymId] as const,
  config: (gymId: string | undefined) =>
    [...leaderboardKeys.all, 'config', gymId] as const,
};

function isNotFound(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 404;
}

// ── Member queries ───────────────────────────────────────────────────────────

export function useLeaderboard() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<LeaderboardExerciseResult[]>({
    queryKey: leaderboardKeys.board(gymId),
    queryFn: () => leaderboardService.getLeaderboard(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useExercises() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<Exercise[]>({
    queryKey: leaderboardKeys.exercises(gymId),
    queryFn: () => leaderboardService.listExercises(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useMyPrs() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<PrSubmission[]>({
    queryKey: leaderboardKeys.myPrs(gymId),
    queryFn: async () => {
      try {
        return await leaderboardService.getMyPrs(gymId!);
      } catch (err) {
        if (isNotFound(err)) return [];
        throw err;
      }
    },
    enabled: Boolean(gymId),
  });
}

// ── Member mutations ─────────────────────────────────────────────────────────

export function useUploadLeaderboardPhoto() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useMutation({
    mutationFn: (photoUri: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return leaderboardService.uploadPhoto(gymId, photoUri);
    },
  });
}

export function useSubmitPr() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      exerciseId: string;
      weightKg: number;
      reps: number;
      photoUrl: string;
      notes?: string;
    }) => {
      if (!gymId) throw new Error('Not authenticated');
      return leaderboardService.submitPr(gymId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.myPrs(gymId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.board(gymId) });
    },
  });
}

// ── Staff queries ────────────────────────────────────────────────────────────

export function usePendingSubmissions() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<PrSubmission[]>({
    queryKey: leaderboardKeys.pending(gymId),
    queryFn: () => leaderboardService.getPendingSubmissions(gymId!),
    enabled: Boolean(gymId),
  });
}

export function useLeaderboardConfig(enabled = true) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery<LeaderboardConfigItem[]>({
    queryKey: leaderboardKeys.config(gymId),
    queryFn: () => leaderboardService.getLeaderboardConfig(gymId!),
    enabled: enabled && Boolean(gymId),
  });
}

// ── Staff mutations ──────────────────────────────────────────────────────────

export function useApproveSubmission() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => {
      if (!gymId) throw new Error('Not authenticated');
      return leaderboardService.approveSubmission(gymId, submissionId);
    },
    onMutate: async (submissionId) => {
      await queryClient.cancelQueries({ queryKey: leaderboardKeys.pending(gymId) });
      const previous = queryClient.getQueryData<PrSubmission[]>(leaderboardKeys.pending(gymId));
      queryClient.setQueryData<PrSubmission[]>(
        leaderboardKeys.pending(gymId),
        (old) => old?.filter((s) => s.id !== submissionId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leaderboardKeys.pending(gymId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.board(gymId) });
    },
  });
}

export function useRejectSubmission() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      if (!gymId) throw new Error('Not authenticated');
      return leaderboardService.rejectSubmission(gymId, submissionId, reason);
    },
    onMutate: async ({ submissionId }) => {
      await queryClient.cancelQueries({ queryKey: leaderboardKeys.pending(gymId) });
      const previous = queryClient.getQueryData<PrSubmission[]>(leaderboardKeys.pending(gymId));
      queryClient.setQueryData<PrSubmission[]>(
        leaderboardKeys.pending(gymId),
        (old) => old?.filter((s) => s.id !== submissionId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leaderboardKeys.pending(gymId), context.previous);
      }
    },
  });
}

export function useUpdateLeaderboardConfig() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      exercises: { exerciseId: string; isActive: boolean; displayOrder: number }[],
    ) => {
      if (!gymId) throw new Error('Not authenticated');
      return leaderboardService.updateLeaderboardConfig(gymId, exercises);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(leaderboardKeys.config(gymId), updated);
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.board(gymId) });
    },
  });
}
