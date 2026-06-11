import { api } from './api';
import type { WorkoutSuggestion, MealSuggestion, MealAnalysis, FoodLog } from '../types';

export const aiService = {
  getWorkoutSuggestion: (gymId: string, memberId: string) =>
    api.post<WorkoutSuggestion>(`/gyms/${gymId}/members/${memberId}/ai/workout-suggestion`, {}),

  getMealSuggestion: (gymId: string, memberId: string) =>
    api.post<MealSuggestion>(`/gyms/${gymId}/members/${memberId}/ai/meal-suggestion`, {}),

  analyseMeal: (gymId: string, memberId: string, description: string) =>
    api.post<MealAnalysis>(`/gyms/${gymId}/members/${memberId}/ai/analyse-meal`, { description }),

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
};
