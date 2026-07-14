import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

function isAuthError(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 401;
}

/**
 * Staleness tiers by data volatility. Higher staleTime = fewer refetches = less
 * server load. Only live views opt back into refetch-on-focus (see individual hooks).
 */
export const STALE = {
  live: 15_000, // gym floor "who's here now" — also refetches on focus
  short: 30_000, // staff review queues (pending submissions)
  default: 60_000, // most lists (members, renewals, announcements, leaderboard)
  static: 10 * 60_000, // near-fixed config (plans, catalogs, exercise list, profile)
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE.default,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => failureCount < 1 && !isAuthError(error),
      // Off by default so thousands of app-foreground events don't stampede the API.
      // Live views (active check-ins, "who's here") opt back in per-hook.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export function subscribeAppStateToFocusManager(): () => void {
  const subscription = AppState.addEventListener('change', onAppStateChange);
  return () => subscription.remove();
}
