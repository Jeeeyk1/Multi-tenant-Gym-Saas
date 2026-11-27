import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { CheckInDialog } from '@/components/dashboard/check-in-dialog';
import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { SubscriptionPanel } from '@/components/billing/subscription-panel';
import { SubscriptionInactiveNotice } from '@/components/billing/subscription-inactive-notice';
import { StaffRole } from '@gym-saas/contracts';
import { roleLabel, usesWebDashboard } from '@/lib/roles';
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

  // Show the highest role, e.g. "Owner" for someone who is both Owner and Staff.
  const topRole = [StaffRole.OWNER, StaffRole.STAFF, StaffRole.TRAINER].find((r) => user.roles.includes(r));
  const role = topRole ? roleLabel(topRole) : undefined;

  if (subscriptionLocked) {
    return (
      <AppShell permissions={user.permissions} userName={user.fullName || user.email} roleLabel={role} gymCode={user.gymCode}>
        {user.permissions.includes('billing.manage') ? <SubscriptionPanel gymId={user.gymId} /> : <SubscriptionInactiveNotice />}
      </AppShell>
    );
  }

  return (
    <AppShell
      permissions={user.permissions}
      userName={user.fullName || user.email}
      roleLabel={role}
      gymCode={user.gymCode}
      gymName={gymDetail?.name}
      gymLocation={gymDetail?.city}
      gymColor={gymDetail?.profile?.primaryColor}
      logoUrl={gymDetail?.profile?.logoUrl}
      action={user.permissions.includes('checkins.manage') ? <CheckInDialog gymId={user.gymId} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
