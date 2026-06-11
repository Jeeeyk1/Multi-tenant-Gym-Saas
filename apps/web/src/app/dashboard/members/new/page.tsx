import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { RegisterMemberForm } from '@/components/members/register-member-form';
import type { MembershipPlan } from '@/types/api';

export default async function NewMemberPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const plans = await api
    .get<MembershipPlan[]>(`/gyms/${user.gymId}/plans`)
    .catch(() => [] as MembershipPlan[]);

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <Link href="/dashboard/members" className="text-sm text-primary hover:underline">
          ← Members
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">Register Member</h1>
        <p className="text-sm text-muted-foreground mt-1">
          An activation email will be sent to the member after registration.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <RegisterMemberForm gymId={user.gymId} plans={plans} />
      </div>
    </div>
  );
}
