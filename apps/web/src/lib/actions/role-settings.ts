'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { formatApiError } from '@/lib/format-error';

export interface RoleSetting {
  key: string;
  role: string;
  permission: string;
  label: string;
  description: string;
  enabled: boolean;
  enabledByDefault: boolean;
}

/** The gym comes from the session, never the browser; the API also checks the caller is the owner. */
export async function updateRoleSetting(key: string, enabled: boolean): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: 'Your session has ended. Sign in again.' };
  if (typeof enabled !== 'boolean') return { error: 'Invalid value.' };
  try {
    await api.put(`/gyms/${user.gymId}/role-settings/${encodeURIComponent(key)}`, { enabled });
    revalidatePath('/dashboard/settings');
    return {};
  } catch (err: unknown) {
    const e = err as { code?: string; requestId?: string };
    console.error(`[role-settings] update failed key=${key} code=${e.code ?? 'none'} ref=${e.requestId ?? 'none'}`);
    return { error: formatApiError(err, 'Could not save this setting.') };
  }
}
