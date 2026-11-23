import { api } from './api';

export interface GymBranding {
  id: string;
  name: string;
  code: string;
  profile: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
  } | null;
}

export const gymService = {
  /** The signed-in gym's name and branding (subset of GET /gyms/:gymId/detail). */
  getBranding: (gymId: string) => api.get<GymBranding>(`/gyms/${gymId}/detail`),
};
