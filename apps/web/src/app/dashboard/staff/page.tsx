import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { StaffClient } from '@/components/staff/staff-client';
import type { StaffMember, GymRole } from '@/types/api';

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [staff, roles] = await Promise.all([
    api.get<StaffMember[]>(`/gyms/${user.gymId}/staff`).catch(() => [] as StaffMember[]),
    api.get<GymRole[]>(`/gyms/${user.gymId}/staff/roles`).catch(() => [] as GymRole[]),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage staff members and their roles.</p>
      </div>
      <StaffClient gymId={user.gymId} staff={staff} roles={roles} />
    </div>
  );
}
