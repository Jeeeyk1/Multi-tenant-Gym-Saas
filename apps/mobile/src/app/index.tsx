import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/member.service';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, isStaff, user } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<'checking' | 'done' | 'pending'>('checking');

  useEffect(() => {
    if (!isAuthenticated || !user || isStaff) return;

    memberService
      .getMyProfile(user.gymId)
      .then((profile) => setOnboardingStatus(profile.onboardingDone ? 'done' : 'pending'))
      .catch(() => setOnboardingStatus('done'));
  }, [isAuthenticated, isStaff, user]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/entry" />;

  // Staff bypass onboarding and go straight to their dashboard
  if (isStaff) return <Redirect href="/(staff)/dashboard" />;

  if (onboardingStatus === 'checking') return null;
  if (onboardingStatus === 'pending') return <Redirect href="/onboarding" />;

  return <Redirect href="/(member)/dashboard" />;
}
