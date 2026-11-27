import { Redirect, Stack } from 'expo-router';
import { STAFF_COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

/**
 * Staff area: tabs live in (tabs); detail screens (member detail, leaderboard, insights, renewals,
 * plans, badges, chat) are pushed on this stack, so they slide in and support swipe-back.
 */
export default function StaffLayout() {
  const { isAuthenticated, isLoading, isStaff } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
  }

  // Members who somehow land here get sent to their own section
  if (!isLoading && !isStaff) {
    return <Redirect href="/(member)/(tabs)/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: STAFF_COLORS.background } }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
