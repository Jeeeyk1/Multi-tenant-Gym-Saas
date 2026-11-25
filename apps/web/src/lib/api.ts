import axios, { AxiosError, type AxiosInstance } from 'axios';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  /** Correlation id from the API response body — surface it in error UI so a user
   * can quote it, and it can be grepped server-side (see docs/03-engineering/logging-and-observability.md). */
  requestId?: string;
}

function normalizeError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ message?: string; code?: string; requestId?: string }>;
    const message = e.response?.data?.message ?? e.message ?? 'Request failed';
    const code = e.response?.data?.code;
    const statusCode = e.response?.status;
    const requestId = e.response?.data?.requestId;
    const apiErr = new Error(message) as Error & ApiError;
    apiErr.code = code;
    apiErr.statusCode = statusCode;
    apiErr.requestId = requestId;
    throw apiErr;
  }
  throw err;
}

async function createClient(): Promise<AxiosInstance> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const client = await createClient();
    try {
      const { data } = await client.get<T>(endpoint);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const client = await createClient();
    try {
      const { data } = await client.post<T>(endpoint, body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  patch: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const client = await createClient();
    try {
      const { data } = await client.patch<T>(endpoint, body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const client = await createClient();
    try {
      const { data } = await client.put<T>(endpoint, body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const client = await createClient();
    try {
      const { data } = await client.delete<T>(endpoint);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },
};

/**
 * GET for server components that render without this data when the API fails. The failure
 * is logged server-side with its request id, so a missing panel can be traced instead of
 * silently showing as empty.
 */
export async function getOr<T, F = T>(endpoint: string, fallback: F): Promise<T | F> {
  try {
    return await api.get<T>(endpoint);
  } catch (err) {
    const e = err as Partial<ApiError>;
    console.warn(
      `[api] GET ${endpoint} failed status=${e.statusCode ?? 'none'} code=${e.code ?? 'none'} ref=${e.requestId ?? 'none'}: ${e.message}`,
    );
    return fallback;
  }
}

/** Unauthenticated axios instance for auth-related calls (login, resolve-code, logout). */
export const authClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
