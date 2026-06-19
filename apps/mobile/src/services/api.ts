import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
};

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.refreshToken);
}

export async function storeTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
  await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
}

export { getAccessToken, getRefreshToken };

// Registered by AuthContext so we can trigger sign-out from inside the api module.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

// Inline refresh to avoid circular dependency with auth.service.ts.
// Returns true if new tokens were stored, false otherwise.
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh calls — only one in-flight at a time.
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json() as { accessToken: string; refreshToken: string };
      await storeTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401 && authenticated && !isRetry) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      return request<T>(endpoint, options, authenticated, true);
    }
    // Refresh failed — signal AuthContext to sign the user out.
    await clearTokens();
    unauthorizedHandler?.();
    const err = new Error('Session expired. Please log in again.') as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.message ?? 'Request failed') as Error & { code?: string; statusCode?: number };
    err.code = body.code;
    err.statusCode = response.status;
    throw err;
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, authenticated = true) =>
    request<T>(endpoint, { method: 'GET' }, authenticated),

  post: <T>(endpoint: string, body?: unknown, authenticated = true) =>
    request<T>(endpoint, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }, authenticated),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.message ?? 'Upload failed') as Error & { code?: string; statusCode?: number };
      err.code = body.code;
      err.statusCode = response.status;
      throw err;
    }

    return response.json() as Promise<T>;
  },
};
