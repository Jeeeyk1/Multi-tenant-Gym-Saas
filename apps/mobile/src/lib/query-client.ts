import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

function isAuthError(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 401;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => failureCount < 1 && !isAuthError(error),
      refetchOnWindowFocus: true,
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
