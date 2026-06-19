'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authClient } from './api';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 8,
};

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const seg = token.split('.')[1];
    return JSON.parse(Buffer.from(seg, 'base64').toString('utf-8'));
  } catch {
    return {};
  }
}

export async function getAdminSession(): Promise<{ id: string; email: string } | null> {
  const store = await cookies();
  const token = store.get('admin_token')?.value;
  if (!token) return null;

  const payload = decodeJwt(token);
  if (payload.type !== 'system_admin' || !payload.sub) return null;

  return { id: payload.sub as string, email: payload.email as string };
}

export async function requireAdminSession(): Promise<{ id: string; email: string }> {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');
  return admin;
}

export async function adminLogin(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) return { error: 'Email and password are required' };

  let accessToken: string;
  try {
    const { data } = await authClient.post<{ accessToken: string }>('/v1/auth/admin/login', {
      email,
      password,
    });
    accessToken = data.accessToken;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const message = (err.response?.data as { message?: string })?.message;
      if (status === 401 || status === 400) return { error: 'Invalid email or password' };
      return { error: message ?? 'Could not reach the server. Try again shortly.' };
    }
    return { error: 'Could not reach the server. Try again shortly.' };
  }

  const store = await cookies();
  store.set('admin_token', accessToken, COOKIE_OPTS);
  redirect('/dashboard');
}

export async function adminLogout(): Promise<void> {
  const store = await cookies();
  store.delete('admin_token');
  redirect('/login');
}
