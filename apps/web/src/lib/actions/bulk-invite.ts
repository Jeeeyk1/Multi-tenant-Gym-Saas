'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api';

export type BulkInviteRowStatus = 'ready' | 'duplicate_in_file' | 'already_registered' | 'invalid';

export interface BulkInviteRow {
  rowNumber: number;
  fullName: string;
  email: string;
  expiryDate: string;
  status: BulkInviteRowStatus;
  reason?: string;
}

export interface BulkInvitePreview {
  rows: BulkInviteRow[];
  summary: { total: number; ready: number; skipped: number; invalid: number };
}

export interface BulkInviteResult {
  created: number;
  skipped: { email: string; reason: string }[];
}

/** Uploads the spreadsheet to the API and returns the validated preview (no writes). */
export async function validateBulkInvite(
  formData: FormData,
): Promise<{ preview?: BulkInvitePreview; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not authenticated' };
  const token = (await cookies()).get('access_token')?.value;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Please choose a file' };

  const fd = new FormData();
  fd.append('file', file);

  try {
    const res = await fetch(`${API_URL}/gyms/${user.gymId}/members/bulk-invite/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (body as { message?: string }).message ?? 'Could not read the file' };
    return { preview: body as BulkInvitePreview };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

/** Creates the given members and queues their invite emails (sent asynchronously). */
export async function bulkInviteMembers(
  members: { email: string; fullName: string; expiryDate: string }[],
): Promise<{ result?: BulkInviteResult; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not authenticated' };
  const token = (await cookies()).get('access_token')?.value;

  try {
    const res = await fetch(`${API_URL}/gyms/${user.gymId}/members/bulk-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ members }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (body as { message?: string }).message ?? 'Could not create members' };
    revalidatePath('/dashboard/members');
    return { result: body as BulkInviteResult };
  } catch {
    return { error: 'Could not reach the server' };
  }
}
