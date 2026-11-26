import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { PlansClient, type SaasPlan } from './plans-client';
import { AiAllowances, type BillingPlanCaps } from './ai-allowances';

export const metadata: Metadata = { title: 'Plans' };

export default async function PlansPage() {
  const [plans, billingPlans] = await Promise.all([
    api.get<SaasPlan[]>('/v1/admin/plans').catch(() => [] as SaasPlan[]),
    api.get<BillingPlanCaps[]>('/v1/admin/billing-plans').catch(() => [] as BillingPlanCaps[]),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] text-muted-foreground">FitOps</p>
          <h1 className="text-xl font-semibold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage FitOps pricing tiers shown on the landing page
          </p>
        </div>
      </div>

      <PlansClient initialPlans={plans} />
      <AiAllowances plans={billingPlans} />
    </div>
  );
}
