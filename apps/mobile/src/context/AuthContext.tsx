import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { authService, decodeJwt } from '../services/auth.service';
import { getAccessToken, clearTokens, setUnauthorizedHandler, setSubscriptionInactiveHandler } from '../services/api';
import { registerPushToken } from '../services/push.service';
import { useTheme } from './ThemeContext';
import { gymService } from '../services/gym.service';
import { DARK_COLORS } from '../constants/theme';
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
  subscriptionLocked: boolean;
  setGymInfo: (info: GymInfo) => void;
  signIn: (gymCode: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setGymTheme, clearGymTheme } = useTheme();
  // ThemeContext's setters are recreated every render; keep the latest in a ref.
  const themeRef = useRef({ setGymTheme, clearGymTheme });
  themeRef.current = { setGymTheme, clearGymTheme };

  /**
   * Loads the signed-in gym's name, colours and logo. Branding is per tenant, so it
   * must come from the gym in the token, never from what an earlier session stored.
   */
  // The gym of the current session; a branding response for any other gym is dropped.
  const sessionGymRef = useRef<string | null>(null);

  const syncGymBranding = useCallback(async (gymId: string | undefined) => {
    if (!gymId) return;
    sessionGymRef.current = gymId;
    try {
      const gym = await gymService.getBranding(gymId);
      if (sessionGymRef.current !== gymId) return;
      await themeRef.current.setGymTheme(
        gym.profile?.primaryColor ?? DARK_COLORS.primary,
        gym.profile?.secondaryColor ?? DARK_COLORS.secondary,
        gym.profile?.logoUrl ?? null,
      );
      setGymInfo((prev) => (prev ? { ...prev, gymName: gym.name, gymCode: gym.code } : prev));
    } catch (err) {
      // Not this user's gym any more: drop the stored branding. When offline, keep what
      // is stored — it was written for this gym by an earlier sync.
      if (sessionGymRef.current !== gymId) return;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 403 || status === 404) await themeRef.current.clearGymTheme();
    }
  }, []);
  const [subscriptionLocked, setSubscriptionLocked] = useState(false);

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

  const signOut = useCallback(async () => {
    sessionGymRef.current = null;
    await authService.logout();
    setUser(null);
    setGymInfo(null);
    await themeRef.current.clearGymTheme();
    setSubscriptionLocked(false);
  }, []);

  // Keep a stable ref so the api module can call signOut without capturing a stale closure.
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOutRef.current();
    });
    setSubscriptionInactiveHandler(() => {
      setSubscriptionLocked(true);
    });
  }, []);

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
      syncGymBranding(newPayload.gymId as string | undefined);
    } else {
      applyPayload(payload);
      syncGymBranding(payload.gymId as string | undefined);
    }

    setIsLoading(false);
  }, [syncGymBranding]);

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
    setSubscriptionLocked(false);
    syncGymBranding(payload.gymId as string);
    // Register push token in the background — never block login
    const gymId = payload.gymId as string;
    registerPushToken(gymId).catch(() => {});
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
        subscriptionLocked,
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
