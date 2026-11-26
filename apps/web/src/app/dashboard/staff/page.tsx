import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { StaffClient } from '@/components/staff/staff-client';
import { StaffRole } from '@gym-saas/contracts';
import type { StaffMember, GymRole } from '@/types/api';

export const metadata: Metadata = { title: 'Staff' };

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.permissions.includes('staff.manage')) redirect('/dashboard');

  const [staff, roles] = await Promise.all([
    api.get<StaffMember[]>(`/gyms/${user.gymId}/staff`).catch(() => [] as StaffMember[]),
    api.get<GymRole[]>(`/gyms/${user.gymId}/staff/roles`).catch(() => [] as GymRole[]),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite your team and choose what each person does. One person can hold more than one role.
        </p>
      </div>
      <StaffClient gymId={user.gymId} staff={staff} roles={roles} canGrantOwner={user.roles.includes(StaffRole.OWNER)} />
    </div>
  );
}
