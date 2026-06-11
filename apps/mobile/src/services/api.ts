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

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.message ?? 'Request failed') as Error & { code?: string; statusCode?: number };
    err.code = body.code;
    err.statusCode = response.status;
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }

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

  /** Upload a file as multipart/form-data. Omit Content-Type so fetch sets the boundary. */
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
