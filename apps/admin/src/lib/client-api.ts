import axios, { AxiosError } from 'axios';

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

// Browser-safe axios instance for 'use client' components.
// Calls Next.js route handlers (/api/...) — cookies are sent automatically by the browser.
// Do NOT use this in server components or server actions — use lib/api.ts there instead.
const client = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

export const clientApi = {
  get: async <T>(path: string): Promise<T> => {
    try {
      const { data } = await client.get<T>(path);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    try {
      const { data } = await client.post<T>(path, body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    try {
      const { data } = await client.patch<T>(path, body);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },

  delete: async <T>(path: string): Promise<T> => {
    try {
      const { data } = await client.delete<T>(path);
      return data;
    } catch (err) {
      normalizeError(err);
    }
  },
};
