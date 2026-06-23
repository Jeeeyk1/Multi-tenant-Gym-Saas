'use server';

import { authClient } from '@/lib/api';
import axios from 'axios';

export type ActivateMemberState = { error: string | null; success: boolean };

export async function activateMember(
  token: string,
  gymCode: string,
  _prev: ActivateMemberState,
  formData: FormData,
): Promise<ActivateMemberState> {
  const password = (formData.get('password') as string | null) ?? '';

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters', success: false };
  }

  try {
    await authClient.post('/auth/activate', { token, password });
    return { error: null, success: true };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { error: 'This activation link is invalid or has already been used.', success: false };
      }
      const message = (err.response?.data as { message?: string })?.message;
      return { error: message ?? 'Activation failed. Please try again.', success: false };
    }
    return { error: 'Could not reach the server. Try again shortly.', success: false };
  }
}
