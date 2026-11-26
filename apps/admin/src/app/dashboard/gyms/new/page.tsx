import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { NewGymForm } from './new-gym-form';

export const metadata: Metadata = { title: 'Invite gym' };

interface BillingPlan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number | null;
}

interface SignupRequest {
  id: string;
  gymName: string;
  ownerName: string;
  email: string;
  planInterest: string | null;
}

export default async function NewGymPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;

  const [plans, lead] = await Promise.all([
    api.get<BillingPlan[]>('/v1/admin/billing-plans').catch(() => [] as BillingPlan[]),
    leadId
      ? api.get<SignupRequest>(`/v1/admin/signup-requests/${leadId}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  return <NewGymForm plans={plans} leadId={leadId} lead={lead} />;
}
