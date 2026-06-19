import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { BadgesClient } from '@/components/badges/badges-client';
import type { GymCustomBadge, ExerciseMilestoneBadge, Exercise } from '@/types/api';

export default async function BadgesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [customBadges, milestoneBadges, exercises] = await Promise.all([
    api.get<GymCustomBadge[]>(`/gyms/${user.gymId}/badges/custom`).catch(() => [] as GymCustomBadge[]),
    api.get<ExerciseMilestoneBadge[]>(`/gyms/${user.gymId}/badges/milestone`).catch(() => [] as ExerciseMilestoneBadge[]),
    api.get<Exercise[]>(`/gyms/${user.gymId}/exercises`).catch(() => [] as Exercise[]),
  ]);

  return (
    <div className="p-8 max-w-2xl space-y-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Badges</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create custom badges to award to members and set exercise milestone thresholds.
        </p>
      </div>

      <BadgesClient
        gymId={user.gymId}
        customBadges={customBadges}
        milestoneBadges={milestoneBadges}
        exercises={exercises}
      />
    </div>
  );
}
