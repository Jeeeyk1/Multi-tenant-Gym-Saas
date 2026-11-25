import { getSessionUser } from '@/lib/auth';
import { getOr } from '@/lib/api';
import { BadgesClient } from '@/components/badges/badges-client';
import type { BadgeLadder, ExerciseMilestoneBadge, GymCustomBadge } from '@/types/api';

export default async function BadgesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [customBadges, milestoneBadges, ladders] = await Promise.all([
    getOr<GymCustomBadge[], null>(`/gyms/${user.gymId}/badges/custom`, null),
    getOr<ExerciseMilestoneBadge[]>(`/gyms/${user.gymId}/badges/milestone`, []),
    getOr<BadgeLadder[], null>(`/gyms/${user.gymId}/badges/ladders`, null),
  ]);

  return (
    <div className="p-8 max-w-3xl space-y-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Badges</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set the lift ladders members earn on the leaderboard, and create badges to award by hand.
        </p>
      </div>

      <BadgesClient
        gymId={user.gymId}
        customBadges={customBadges}
        ladders={ladders}
        olderMilestones={milestoneBadges.filter((m) => m.tier === null && m.isActive)}
      />
    </div>
  );
}
