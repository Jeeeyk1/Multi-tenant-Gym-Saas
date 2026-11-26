import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { SubscriptionPanel } from '@/components/billing/subscription-panel';
import { SubscriptionInactiveNotice } from '@/components/billing/subscription-inactive-notice';
import { usesWebDashboard } from '@/lib/roles';
import { isStaffToken } from '@/lib/utils';

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

  // Trainers and members use the mobile app. Also covers sessions that started before someone became
  // trainer-only, and members who reach /dashboard directly.
  if (!usesWebDashboard(user.roles)) {
    const as = isStaffToken({ roles: user.roles }) ? 'trainer' : 'member';
    redirect(gymDetail?.code ? `/${gymDetail.code}/not-staff?as=${as}` : '/');
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

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          permissions={user.permissions}
          userName={user.fullName || user.email}
          gymCode={user.gymCode}
          gymName={gymDetail?.name}
          gymLocation={gymDetail?.city}
          gymColor={gymDetail?.profile?.primaryColor}
          logoUrl={gymDetail?.profile?.logoUrl}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
