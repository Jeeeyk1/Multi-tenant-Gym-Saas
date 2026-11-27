import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useMyProfile } from '../hooks/members';
import { getPreferredView, type PreferredView } from '../lib/preferred-view';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, isStaff, isAlsoMember } = useAuth();
  const profileQ = useMyProfile();
  const [preferred, setPreferred] = useState<PreferredView | null>(null);

  useEffect(() => {
    getPreferredView().then(setPreferred);
  }, []);

  if (isLoading || preferred === null) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/entry" />;

  // Staff go straight to their dashboard, unless they're also a member who chose the member view.
  if (isStaff && !(isAlsoMember && preferred === 'member')) return <Redirect href="/(staff)/(tabs)/dashboard" />;

  // Profile query: data === undefined → still loading; data === null → no profile (treat as done);
  // data with onboardingDone false → onboarding pending.
  if (profileQ.isLoading) return null;
  if (profileQ.data && !profileQ.data.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(member)/(tabs)/dashboard" />;
}
