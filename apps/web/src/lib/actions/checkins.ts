'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { MemberListItem, StaffCheckIn } from '@/types/api';

export async function checkOutMember(gymId: string, checkinId: string): Promise<void> {
  await api.patch(`/gyms/${gymId}/checkins/${checkinId}/checkout`);
  revalidatePath('/dashboard');
}

export async function checkInMember(gymId: string, memberId: string): Promise<{ error?: string }> {
  try {
    await api.post<StaffCheckIn>(`/gyms/${gymId}/checkins`, {
      method: 'MANUAL_STAFF',
      memberId,
    });
    revalidatePath('/dashboard');
    return {};
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'ALREADY_CHECKED_IN') return { error: 'This member is already checked in.' };
    if (e.code === 'MEMBER_NOT_ACTIVE') return { error: 'Member account is not active.' };
    if (e.code === 'MEMBERSHIP_EXPIRED') return { error: 'Membership has expired.' };
    return { error: e.message ?? 'Check-in failed. Please try again.' };
  }
}

export async function loadMembers(gymId: string): Promise<MemberListItem[]> {
  const data = await api.get<{ data: MemberListItem[] }>(
    `/gyms/${gymId}/members?page=1&limit=200`,
  );
  return data.data;
}
