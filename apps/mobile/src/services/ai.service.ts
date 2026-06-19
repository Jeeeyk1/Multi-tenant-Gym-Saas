import { api } from './api';
import type { WorkoutSuggestion, MealSuggestion, MealAnalysis, FoodLog, ExerciseInstructions } from '../types';

export const aiService = {
  getLatestWorkoutPlan: (gymId: string, memberId: string) =>
    api.get<{ suggestion: string; generatedAt: string } | null>(
      `/gyms/${gymId}/members/${memberId}/ai/workout-plan`,
    ),

  getWorkoutSuggestion: (gymId: string, memberId: string) =>
    api.post<WorkoutSuggestion>(`/gyms/${gymId}/members/${memberId}/ai/workout-suggestion`, {}),

  getMealSuggestion: (gymId: string, memberId: string) =>
    api.post<MealSuggestion>(`/gyms/${gymId}/members/${memberId}/ai/meal-suggestion`, {}),

  analyseMeal: (gymId: string, memberId: string, options: { description?: string; photoUrl?: string }) =>
    api.post<MealAnalysis>(`/gyms/${gymId}/members/${memberId}/ai/analyse-meal`, options),

  uploadFoodPhoto: async (gymId: string, memberId: string, photoUri: string): Promise<{ url: string }> => {
    const formData = new FormData();
    const filename = photoUri.split('/').pop() ?? 'photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    formData.append('photo', { uri: photoUri, name: filename, type: mimeType } as unknown as Blob);
    return api.upload<{ url: string }>(`/gyms/${gymId}/members/${memberId}/ai/food-photo`, formData);
  },

  logFood: (
    gymId: string,
    memberId: string,
    data: {
      description: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    },
  ) => api.post<FoodLog>(`/gyms/${gymId}/members/${memberId}/food-logs`, data),

  listFoodLogs: (gymId: string, memberId: string, limit = 20) =>
    api.get<FoodLog[]>(`/gyms/${gymId}/members/${memberId}/food-logs?limit=${limit}`),

  getExerciseInstructions: (gymId: string, memberId: string, exerciseName: string) =>
    api.post<ExerciseInstructions>(`/gyms/${gymId}/members/${memberId}/ai/exercise-instructions`, { exerciseName }),

  getExerciseMedia: (gymId: string, memberId: string, exerciseName: string) =>
    api.get<{ gifUrl: string | null }>(
      `/gyms/${gymId}/members/${memberId}/ai/exercise-media?name=${encodeURIComponent(exerciseName)}`,
    ),
};
