'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { StaffAnnouncement } from '@/types/api';

export async function createAnnouncement(
  gymId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const content = (formData.get('content') as string | null)?.trim() ?? '';
  const isPinned = formData.get('isPinned') === 'true';
  const publishAt = (formData.get('publishAt') as string | null) || undefined;
  const expiresAt = (formData.get('expiresAt') as string | null) || undefined;

  if (!title || !content) return { error: 'Title and content are required.' };

  try {
    await api.post<StaffAnnouncement>(`/gyms/${gymId}/announcements`, {
      title,
      content,
      isPinned,
      publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
    revalidatePath('/dashboard/announcements');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to create announcement.' };
  }
}

export async function updateAnnouncement(
  gymId: string,
  announcementId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() || undefined;
  const content = (formData.get('content') as string | null)?.trim() || undefined;
  const isPinned = formData.get('isPinned') === 'true';
  const publishAtRaw = formData.get('publishAt') as string | null;
  const expiresAtRaw = formData.get('expiresAt') as string | null;

  const body: Record<string, unknown> = { title, content, isPinned };
  if (publishAtRaw !== null) {
    body.publishAt = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;
  }
  if (expiresAtRaw !== null) {
    body.expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
  }

  try {
    await api.patch<StaffAnnouncement>(`/gyms/${gymId}/announcements/${announcementId}`, body);
    revalidatePath('/dashboard/announcements');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to update announcement.' };
  }
}

export async function archiveAnnouncement(
  gymId: string,
  announcementId: string,
): Promise<{ error?: string }> {
  try {
    await api.delete(`/gyms/${gymId}/announcements/${announcementId}`);
    revalidatePath('/dashboard/announcements');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to archive announcement.' };
  }
}
