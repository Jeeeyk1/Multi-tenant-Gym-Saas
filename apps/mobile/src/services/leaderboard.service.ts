import { api } from './api';
import type {
  Exercise,
  LeaderboardConfigItem,
  LeaderboardExerciseResult,
  PrSubmission,
} from '../types';

export const leaderboardService = {
  // ── Public (member + staff) ───────────────────────────────────────────────

  getLeaderboard: (gymId: string) =>
    api.get<LeaderboardExerciseResult[]>(`/gyms/${gymId}/leaderboard`),

  getExerciseLeaderboard: (gymId: string, exerciseId: string) =>
    api.get<LeaderboardExerciseResult>(`/gyms/${gymId}/leaderboard/${exerciseId}`),

  listExercises: (gymId: string) =>
    api.get<Exercise[]>(`/gyms/${gymId}/exercises`),

  getMyPrs: (gymId: string) =>
    api.get<PrSubmission[]>(`/gyms/${gymId}/members/me/prs`),

  // ── Photo upload ──────────────────────────────────────────────────────────

  uploadPhoto: async (gymId: string, photoUri: string): Promise<{ url: string }> => {
    const formData = new FormData();
    const filename = photoUri.split('/').pop() ?? 'photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('photo', {
      uri: photoUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    return api.upload<{ url: string }>(`/gyms/${gymId}/leaderboard/photos`, formData);
  },

  // ── PR submission ─────────────────────────────────────────────────────────

  submitPr: (
    gymId: string,
    data: {
      exerciseId: string;
      weightKg: number;
      reps: number;
      photoUrl: string;
      notes?: string;
    },
  ) => api.post<PrSubmission>(`/gyms/${gymId}/leaderboard/submissions`, data),

  // ── Staff ─────────────────────────────────────────────────────────────────

  getLeaderboardConfig: (gymId: string) =>
    api.get<LeaderboardConfigItem[]>(`/gyms/${gymId}/leaderboard/config`),

  updateLeaderboardConfig: (
    gymId: string,
    exercises: { exerciseId: string; isActive: boolean; displayOrder: number }[],
  ) => api.put<LeaderboardConfigItem[]>(`/gyms/${gymId}/leaderboard/config`, { exercises }),

  getPendingSubmissions: (gymId: string) =>
    api.get<PrSubmission[]>(`/gyms/${gymId}/leaderboard/submissions/pending`),

  approveSubmission: (gymId: string, submissionId: string) =>
    api.patch<PrSubmission>(`/gyms/${gymId}/leaderboard/submissions/${submissionId}/approve`),

  rejectSubmission: (gymId: string, submissionId: string, reason: string) =>
    api.patch<PrSubmission>(`/gyms/${gymId}/leaderboard/submissions/${submissionId}/reject`, { reason }),
};
