import { api } from './api';
import type { DailyNutrition, FitnessPlan, FitnessPlanOptions, WeighInResult, WeightLog } from '../types';

const base = (gymId: string, memberId: string) => `/gyms/${gymId}/members/${memberId}/fitness-plan`;

export const fitnessPlanService = {
  getOptions: (gymId: string, memberId: string) =>
    api.get<FitnessPlanOptions>(`${base(gymId, memberId)}/options`),

  /** Omit `pace` to take the recommended one; it must be omitted for a maintenance plan. */
  save: (gymId: string, memberId: string, pace?: string) =>
    api.post<FitnessPlan & { adviseProfessional: boolean }>(base(gymId, memberId), pace ? { pace } : {}),

  getCurrent: (gymId: string, memberId: string) =>
    api.get<{ plan: FitnessPlan | null }>(base(gymId, memberId)),

  /** Logs today's weight; the API recalculates the plan after a 2 kg change. */
  weighIn: (gymId: string, memberId: string, weightKg: number) =>
    api.post<WeighInResult>(`${base(gymId, memberId)}/weigh-ins`, { weightKg }),

  getWeightLogs: (gymId: string, memberId: string) =>
    api.get<WeightLog[]>(`/gyms/${gymId}/members/${memberId}/weight-logs`),

  /** `date` is YYYY-MM-DD in the gym's timezone; defaults to today there. */
  getDailyNutrition: (gymId: string, memberId: string, date?: string) =>
    api.get<DailyNutrition>(`${base(gymId, memberId)}/daily-nutrition${date ? `?date=${date}` : ''}`),
};
