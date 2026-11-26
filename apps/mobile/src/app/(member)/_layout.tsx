import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * Member area: the tab bar lives in (tabs); detail screens are pushed on this stack so they
 * slide in, support swipe-back, and `router.back()` returns to where the member came from.
 */
export default function MemberLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
