import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useMyProfile } from '../hooks/members';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, isStaff } = useAuth();
  const profileQ = useMyProfile();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/entry" />;

  // Staff bypass onboarding and go straight to their dashboard
  if (isStaff) return <Redirect href="/(staff)/dashboard" />;

  // Profile query: data === undefined → still loading; data === null → no profile (treat as done);
  // data with onboardingDone false → onboarding pending.
  if (profileQ.isLoading) return null;
  if (profileQ.data && !profileQ.data.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(member)/dashboard" />;
}
