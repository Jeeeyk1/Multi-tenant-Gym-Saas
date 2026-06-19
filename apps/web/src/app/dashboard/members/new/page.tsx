import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { RegisterMemberForm } from '@/components/members/register-member-form';
import type { MembershipPlan } from '@/types/api';

const TIPS = [
  'A welcome email is sent automatically with login instructions.',
  'Member gets a unique QR code for fast check-ins.',
  'If a plan is selected, the expiry is computed from today.',
  'The email address is used to log in on the mobile app.',
];

export default async function NewMemberPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const plans = await api
    .get<MembershipPlan[]>(`/gyms/${user.gymId}/plans`)
    .catch(() => [] as MembershipPlan[]);

  const activePlans = plans.filter((p) => p.isActive);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/members"
          className="text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1 mb-3"
        >
          ← Members
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Register Member</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below — an invite email is sent automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Registration form */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <RegisterMemberForm gymId={user.gymId} plans={plans} />
        </div>

        {/* Right: Plans + tips */}
        <div className="space-y-4">
          {activePlans.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Available Plans
              </p>
              <div className="space-y-2">
                {activePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.durationDays} days</p>
                    </div>
                    <p className="text-base font-bold text-primary shrink-0">
                      ₱{plan.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Notes
            </p>
            <ul className="space-y-2.5">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-primary shrink-0 mt-px font-bold">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
