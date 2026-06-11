'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import axios from 'axios';
import { authClient } from './api';
import { decodeJwt, isStaffToken } from './utils';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export async function resolveCode(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase() ?? '';

  if (!code) return { error: 'Please enter your gym or organization code' };

  let data: {
    type: 'GYM' | 'ORGANIZATION';
    name: string;
    code?: string;
    slug?: string;
  };

  try {
    const res = await authClient.post<typeof data>('/auth/resolve-code', { code });
    data = res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        return { error: 'Code not found. Check with your gym and try again.' };
      }
      return { error: 'Could not reach the server. Try again shortly.' };
    }
    return { error: 'Could not reach the server. Try again shortly.' };
  }

  if (data.type === 'GYM') {
    redirect(`/${data.code}/login?type=gym&name=${encodeURIComponent(data.name)}`);
  } else {
    redirect(`/${data.slug}/login?type=org&name=${encodeURIComponent(data.name)}`);
  }
}

export async function login(
  code: string,
  type: 'gym' | 'org',
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) return { error: 'Please fill in all fields' };

  const endpoint = type === 'gym' ? '/auth/gym/login' : '/auth/org/login';
  let data: { accessToken: string; refreshToken: string };

  try {
    const payload = type === 'gym' ? { gymCode: code, email, password } : { orgSlug: code, email, password };
    const res = await authClient.post<typeof data>(endpoint, payload);
    data = res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as { code?: string; message?: string } | undefined;
      if (body?.code === 'INVALID_CREDENTIALS')
        return { error: 'Wrong email or password. Please try again.' };
      if (body?.code === 'MEMBERSHIP_SUSPENDED')
        return { error: 'This account is suspended. Contact your gym.' };
      if (err.response) return { error: body?.message ?? 'Login failed. Please try again.' };
    }
    return { error: 'Could not reach the server. Try again shortly.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('access_token', data.accessToken, COOKIE_OPTS);
  cookieStore.set('refresh_token', data.refreshToken, COOKIE_OPTS);

  const payload = decodeJwt(data.accessToken);

  if (type === 'org') {
    redirect('/org');
  }

  if (!isStaffToken(payload)) {
    redirect(`/${code}/not-staff`);
  }

  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();

  const token = cookieStore.get('access_token')?.value;
  if (token) {
    try {
      await authClient.post('/auth/logout', null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort — cookies are cleared regardless
    }
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  redirect('/');
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string;
  fullName: string;
  gymId: string;
  gymCode: string;
  organizationId: string;
  orgRole: string;
  roles: string[];
  permissions: string[];
  type: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload.sub) return null;

  return {
    id: payload.sub as string,
    email: (payload.email as string) ?? '',
    fullName: (payload.fullName as string) ?? '',
    gymId: (payload.gymId as string) ?? '',
    gymCode: (payload.gymCode as string) ?? '',
    organizationId: (payload.organizationId as string) ?? '',
    orgRole: (payload.orgRole as string) ?? '',
    roles: (payload.roles as string[]) ?? [],
    permissions: (payload.permissions as string[]) ?? [],
    type: (payload.type as string) ?? 'gym',
  };
}
