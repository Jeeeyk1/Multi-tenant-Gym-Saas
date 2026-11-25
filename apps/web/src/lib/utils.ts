import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeJwt(token: string): Record<string, unknown> {
  const segment = token.split('.')[1];
  if (!segment) return {};
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  try {
    // Works in both Node (Buffer) and Edge (atob)
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf-8')
        : atob(base64);
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function isStaffToken(payload: Record<string, unknown>): boolean {
  const roles = (payload.roles as string[]) ?? [];
  return !roles.every((r) => r === 'MEMBER');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
