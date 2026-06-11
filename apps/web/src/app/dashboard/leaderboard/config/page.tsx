import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { LeaderboardConfigClient } from '@/components/leaderboard/config-client';
import type { Exercise, LeaderboardConfigItem } from '@/types/api';

export default async function LeaderboardConfigPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [allExercises, config] = await Promise.all([
    api.get<Exercise[]>(`/gyms/${user.gymId}/exercises`).catch(() => [] as Exercise[]),
    api.get<LeaderboardConfigItem[]>(`/gyms/${user.gymId}/leaderboard/config`).catch(() => [] as LeaderboardConfigItem[]),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/leaderboard"
          className="text-muted-foreground hover:text-foreground transition text-sm"
        >
          ← Leaderboard
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard Config</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle which exercises appear on the leaderboard
          </p>
        </div>
      </div>

      <LeaderboardConfigClient
        allExercises={allExercises}
        config={config}
        gymId={user.gymId}
      />
    </div>
  );
}
