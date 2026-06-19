'use server';

import { redirect } from 'next/navigation';
import { authClient } from '@/lib/api';
import axios from 'axios';

export async function resetPassword(
  token: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const password = (formData.get('password') as string | null) ?? '';

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  try {
    await authClient.post('/auth/reset-password', { token, password });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { error: 'This reset link is invalid or has expired. Please request a new one.' };
      }
      const message = (err.response?.data as { message?: string })?.message;
      return { error: message ?? 'Reset failed. Please try again.' };
    }
    return { error: 'Could not reach the server. Try again shortly.' };
  }

  redirect('/?reset=1');
}
