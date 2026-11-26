import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { PlansClient } from '@/components/plans/plans-client';
import type { MembershipPlan } from '@/types/api';

export const metadata: Metadata = { title: 'Plans' };

export default async function PlansPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.permissions.includes('plans.view')) redirect('/dashboard');

  const plans = await api
    .get<MembershipPlan[]>(`/gyms/${user.gymId}/plans`)
    .catch(() => [] as MembershipPlan[]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Membership Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the plans members can enroll in.
        </p>
      </div>

      <PlansClient gymId={user.gymId} plans={plans} />
    </div>
  );
}
