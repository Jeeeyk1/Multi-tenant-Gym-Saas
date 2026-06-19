'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { MemberDetail, RenewalRecord } from '@/types/api';

export async function registerMember(
  gymId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const phone = (formData.get('phone') as string | null)?.trim() || undefined;
  const planId = (formData.get('planId') as string | null) || undefined;
  const expiryDate = (formData.get('expiryDate') as string | null) || undefined;

  if (!fullName || !email) return { error: 'Full name and email are required.' };
  if (!planId && !expiryDate) return { error: 'Select a plan or enter an expiry date.' };

  let member: MemberDetail;
  try {
    member = await api.post<MemberDetail>(`/gyms/${gymId}/members`, {
      fullName,
      email,
      phone,
      planId,
      expiryDate,
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'CONFLICT' || e.message?.toLowerCase().includes('already'))
      return { error: 'A member with this email already exists.' };
    return { error: e.message ?? 'Registration failed. Please try again.' };
  }

  revalidatePath('/dashboard/members');
  redirect(`/dashboard/members/${member.id}`);
}

export async function suspendMember(gymId: string, memberId: string): Promise<{ error?: string }> {
  try {
    await api.patch(`/gyms/${gymId}/members/${memberId}/suspend`);
    revalidatePath(`/dashboard/members/${memberId}`);
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Could not suspend member.' };
  }
}

export async function reactivateMember(gymId: string, memberId: string): Promise<{ error?: string }> {
  try {
    await api.patch(`/gyms/${gymId}/members/${memberId}/reactivate`);
    revalidatePath(`/dashboard/members/${memberId}`);
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Could not reactivate member.' };
  }
}

export async function renewMember(
  gymId: string,
  memberId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const amountPaid = parseFloat((formData.get('amountPaid') as string | null) ?? '0');
  const planId = (formData.get('planId') as string | null) || undefined;
  const paymentMethod = (formData.get('paymentMethod') as string | null)?.trim() || undefined;
  const notes = (formData.get('notes') as string | null)?.trim() || undefined;

  if (!amountPaid || amountPaid <= 0) return { error: 'Enter a valid amount paid.' };

  try {
    await api.post<RenewalRecord>(`/gyms/${gymId}/members/${memberId}/renew`, {
      amountPaid,
      planId,
      paymentMethod,
      notes,
    });
    revalidatePath(`/dashboard/members/${memberId}`);
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Renewal failed. Please try again.' };
  }
}

export async function removeMember(gymId: string, memberId: string): Promise<{ error?: string }> {
  try {
    await api.delete(`/gyms/${gymId}/members/${memberId}`);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Could not remove member.' };
  }
  revalidatePath('/dashboard/members');
  redirect('/dashboard/members');
}
