import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, decodeJwt } from '../services/auth.service';
import { getAccessToken, clearTokens } from '../services/api';
import { registerPushToken } from '../services/push.service';
import type { AuthUser } from '../types';

interface GymInfo {
  gymId: string;
  gymCode: string;
  gymName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  gymInfo: GymInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  setGymInfo: (info: GymInfo) => void;
  signIn: (gymCode: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateFromToken = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const payload = decodeJwt(token);
    const exp = (payload.exp as number) ?? 0;

    if (Date.now() / 1000 > exp) {
      const refreshed = await authService.refresh();
      if (!refreshed) {
        await clearTokens();
        setIsLoading(false);
        return;
      }
      const newToken = await getAccessToken();
      if (!newToken) {
        setIsLoading(false);
        return;
      }
      const newPayload = decodeJwt(newToken);
      applyPayload(newPayload);
    } else {
      applyPayload(payload);
    }

    setIsLoading(false);
  }, []);

  function applyPayload(payload: Record<string, unknown>) {
    setUser({
      id: payload.sub as string,
      email: payload.email as string,
      fullName: (payload.fullName as string) ?? '',
      gymId: payload.gymId as string,
      gymCode: payload.gymCode as string,
      roles: (payload.roles as string[]) ?? [],
      permissions: (payload.permissions as string[]) ?? [],
    });
    setGymInfo({
      gymId: payload.gymId as string,
      gymCode: payload.gymCode as string,
      gymName: (payload.gymName as string) ?? '',
    });
  }

  useEffect(() => {
    hydrateFromToken();
  }, [hydrateFromToken]);

  const signIn = async (gymCode: string, email: string, password: string) => {
    const res = await authService.login(gymCode, email, password);
    const payload = decodeJwt(res.accessToken);
    applyPayload({
      ...payload,
      fullName: res.user.fullName,
    });
    // Register push token in the background — never block login
    const gymId = payload.gymId as string;
    registerPushToken(gymId).catch(() => {});
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setGymInfo(null);
  };

  const isStaff = user !== null && !user.roles.every((r) => r === 'MEMBER');

  return (
    <AuthContext.Provider
      value={{
        user,
        gymInfo,
        isLoading,
        isAuthenticated: user !== null,
        isStaff,
        setGymInfo,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
