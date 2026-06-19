import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { SettingsForm } from '@/components/settings/settings-form';
import { SchedulesForm } from '@/components/settings/schedules-form';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const gymDetail = await getGymDetail();

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your gym&apos;s branding, contact info, and opening hours.
        </p>
      </div>
      <div className="space-y-6">
        <SettingsForm gymId={user.gymId} gymDetail={gymDetail} />
        <SchedulesForm gymId={user.gymId} schedules={gymDetail.schedules ?? []} />
      </div>
    </div>
  );
}
