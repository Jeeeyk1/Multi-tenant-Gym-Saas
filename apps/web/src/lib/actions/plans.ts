'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { MembershipPlan } from '@/types/api';

export async function createPlan(
  gymId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const type = (formData.get('type') as string | null) ?? '';
  const description = (formData.get('description') as string | null)?.trim() || undefined;
  const price = parseFloat((formData.get('price') as string | null) ?? '0');
  const durationDays = parseInt((formData.get('durationDays') as string | null) ?? '0', 10);

  if (!name || !type) return { error: 'Name and type are required.' };
  if (!price || price <= 0) return { error: 'Price must be greater than 0.' };
  if (!durationDays || durationDays < 1) return { error: 'Duration must be at least 1 day.' };

  try {
    await api.post<MembershipPlan>(`/gyms/${gymId}/plans`, {
      name,
      type,
      description,
      price,
      durationDays,
    });
    revalidatePath('/dashboard/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to create plan.' };
  }
}

export async function updatePlan(
  gymId: string,
  planId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const name = (formData.get('name') as string | null)?.trim() || undefined;
  const type = (formData.get('type') as string | null) || undefined;
  const description = (formData.get('description') as string | null)?.trim() || undefined;
  const priceRaw = formData.get('price') as string | null;
  const durationRaw = formData.get('durationDays') as string | null;
  const price = priceRaw ? parseFloat(priceRaw) : undefined;
  const durationDays = durationRaw ? parseInt(durationRaw, 10) : undefined;

  try {
    await api.patch<MembershipPlan>(`/gyms/${gymId}/plans/${planId}`, {
      name,
      type,
      description,
      price,
      durationDays,
    });
    revalidatePath('/dashboard/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to update plan.' };
  }
}

export async function togglePlanActive(
  gymId: string,
  planId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/gyms/${gymId}/plans/${planId}`, { isActive });
    revalidatePath('/dashboard/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to update plan.' };
  }
}
