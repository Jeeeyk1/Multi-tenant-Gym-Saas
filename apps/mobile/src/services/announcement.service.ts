import { api } from './api';
import type { Announcement } from '../types';

export const announcementService = {
  list: (gymId: string) =>
    api.get<Announcement[]>(`/gyms/${gymId}/announcements`),

  markRead: (gymId: string, announcementId: string) =>
    api.post<{ ok: boolean }>(`/gyms/${gymId}/announcements/${announcementId}/read`),
};
