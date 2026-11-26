import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { SettingsForm } from '@/components/settings/settings-form';
import { SchedulesForm } from '@/components/settings/schedules-form';
import { TeamPermissions } from '@/components/settings/team-permissions';
import { getOr } from '@/lib/api';
import type { RoleSetting } from '@/lib/actions/role-settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.permissions.includes('gym.settings')) redirect('/dashboard');

  const [gymDetail, roleSettings] = await Promise.all([
    getGymDetail(),
    getOr<RoleSetting[], null>(`/gyms/${user.gymId}/role-settings`, null),
  ]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your gym&apos;s branding, contact info, opening hours and what your team can do.
        </p>
      </div>
      <div className="space-y-6">
        <SettingsForm gymId={user.gymId} gymDetail={gymDetail} />
        <SchedulesForm gymId={user.gymId} schedules={gymDetail.schedules ?? []} />
        <TeamPermissions settings={roleSettings} />
      </div>
    </div>
  );
}
