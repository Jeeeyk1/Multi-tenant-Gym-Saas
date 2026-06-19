import { api } from '@/lib/api';
import { PlansClient } from './plans-client';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default async function PlansPage() {
  const plans = await api.get<SaasPlan[]>('/v1/admin/plans').catch(() => [] as SaasPlan[]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage LiftHub SaaS pricing tiers shown on the landing page
          </p>
        </div>
      </div>

      <PlansClient initialPlans={plans} />
    </div>
  );
}
