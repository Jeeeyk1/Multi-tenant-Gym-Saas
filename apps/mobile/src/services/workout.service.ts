import { api } from './api';
import type { WorkoutSession, WorkoutSessionsPage } from '../types';

export const workoutService = {
  logSession: (
    gymId: string,
    data: {
      workoutType: string;
      startedAt: string;
      endedAt: string;
      durationMinutes: number;
      caloriesBurned?: number;
      avgHeartRate?: number;
      notes?: string;
    },
  ) => api.post<WorkoutSession>(`/gyms/${gymId}/workout-sessions`, data),

  listSessions: (gymId: string, page = 1, limit = 20) =>
    api.get<WorkoutSessionsPage>(`/gyms/${gymId}/workout-sessions?page=${page}&limit=${limit}`),
};
