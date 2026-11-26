import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { SubscriptionPanel } from '@/components/billing/subscription-panel';

export const metadata: Metadata = { title: 'Billing' };

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');
  if (!user.permissions.includes('billing.manage')) redirect('/dashboard');

  return <SubscriptionPanel gymId={user.gymId} />;
}
