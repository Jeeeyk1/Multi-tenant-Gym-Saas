import axios, { AxiosError, type AxiosInstance } from 'axios';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

function normalizeError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ message?: string; code?: string }>;
    const message = e.response?.data?.message ?? e.message ?? 'Request failed';
    const code = e.response?.data?.code;
    const statusCode = e.response?.status;
    const apiErr = new Error(message) as Error & ApiError;
    apiErr.code = code;
    apiErr.statusCode = statusCode;
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

/** Unauthenticated axios instance for auth-related calls (login, resolve-code, logout). */
export const authClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
