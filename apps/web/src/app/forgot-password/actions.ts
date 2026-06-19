'use server';

import { authClient } from '@/lib/api';
import axios from 'axios';

export interface ForgotPasswordState {
  error: string | null;
  submitted: boolean;
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';

  if (!email) return { error: 'Please enter your email address', submitted: false };

  try {
    await authClient.post('/auth/forgot-password', { email });
    return { error: null, submitted: true };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return { error: 'Could not reach the server. Try again shortly.', submitted: false };
    }
    return { error: 'Something went wrong. Please try again.', submitted: false };
  }
}
