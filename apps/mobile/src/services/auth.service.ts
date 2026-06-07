import { api, storeTokens, clearTokens, getRefreshToken } from './api';
import type { ResolveCodeResponse, LoginResponse } from '../types';

export const authService = {
  resolveCode: (code: string) =>
    api.post<ResolveCodeResponse>('/auth/resolve-code', { code }, false),

  login: async (gymCode: string, email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/gym/login', { gymCode, email, password }, false);
    await storeTokens(res.accessToken, res.refreshToken);
    return res;
  },

  refresh: async (): Promise<boolean> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await api.post<LoginResponse>('/auth/refresh', { refreshToken }, false);
      await storeTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      return false;
    }
  },

  logout: async (): Promise<void> => {
    const refreshToken = await getRefreshToken();
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      await clearTokens();
    }
  },

  activate: (token: string, password: string) =>
    api.post('/auth/activate', { token, password }, false),
};

export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}
