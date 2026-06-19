'use server';

import { redirect } from 'next/navigation';
import { authClient } from '@/lib/api';
import axios from 'axios';

export async function activateAccount(
  token: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const password = (formData.get('password') as string | null) ?? '';

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  try {
    await authClient.post('/auth/activate', { token, password });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message = (err.response?.data as { message?: string })?.message;
      if (err.response?.status === 400 || err.response?.status === 404) {
        console.log("Error code "+ err.response?.status)
        return { error: 'This activation link is invalid or has already been used.' };
      }
      return { error: message ?? 'Activation failed. Please try again.' };
    }
    return { error: 'Could not reach the server. Try again shortly.' };
  }

  redirect('/?activated=1');
}
