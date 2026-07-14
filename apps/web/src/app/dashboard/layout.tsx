import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { hexToHsl } from '@/lib/utils';
import { SubscriptionPanel } from '@/components/billing/subscription-panel';
import { SubscriptionInactiveNotice } from '@/components/billing/subscription-inactive-notice';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect('/');

  let gymDetail = null;
  let subscriptionLocked = false;
  try {
    gymDetail = await getGymDetail();
  } catch (err) {
    // The global subscription guard 402s every gym-scoped call once the gym is locked —
    // getGymDetail doubles as the cheapest probe for that state.
    subscriptionLocked = (err as { statusCode?: number }).statusCode === 402;
  }

  if (subscriptionLocked) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar permissions={user.permissions} userName={user.fullName || user.email} gymCode={user.gymCode} />
        <main className="flex-1 overflow-y-auto">
          {user.permissions.includes('billing.manage') ? (
            <SubscriptionPanel gymId={user.gymId} />
          ) : (
            <SubscriptionInactiveNotice />
          )}
        </main>
      </div>
    );
  }

  const primaryHsl = gymDetail?.profile?.primaryColor
    ? hexToHsl(gymDetail.profile.primaryColor)
    : null;
  const secondaryHsl = gymDetail?.profile?.secondaryColor
    ? hexToHsl(gymDetail.profile.secondaryColor)
    : null;

  const cssVars = [
    primaryHsl && `--primary: ${primaryHsl};`,
    secondaryHsl && `--secondary: ${secondaryHsl};`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {cssVars && <style>{`:root { ${cssVars} }`}</style>}
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          permissions={user.permissions}
          userName={user.fullName || user.email}
          gymCode={user.gymCode}
          gymName={gymDetail?.name}
          logoUrl={gymDetail?.profile?.logoUrl}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
