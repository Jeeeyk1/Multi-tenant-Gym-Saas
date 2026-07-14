'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { MySubscriptionResponse } from '@/types/api';

export async function getMySubscription(gymId: string): Promise<MySubscriptionResponse> {
  return api.get<MySubscriptionResponse>(`/gyms/${gymId}/subscription`);
}

export async function submitPayment(
  gymId: string,
  invoiceId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const reference = (formData.get('reference') as string | null)?.trim() ?? '';
  const method = (formData.get('method') as string | null)?.trim() || undefined;

  if (!reference) return { error: 'Payment reference is required.' };

  try {
    await api.post(`/gyms/${gymId}/subscription/invoices/${invoiceId}/pay`, { reference, method });
    revalidatePath('/dashboard/billing');
    revalidatePath('/dashboard');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to submit payment.' };
  }
}
