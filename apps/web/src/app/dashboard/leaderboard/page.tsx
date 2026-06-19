import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import type { LeaderboardExerciseResult } from '@/types/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    CHEST: 'bg-blue-500/10 text-blue-400',
    BACK: 'bg-green-500/10 text-green-400',
    LEGS: 'bg-purple-500/10 text-purple-400',
    SHOULDERS: 'bg-orange-500/10 text-orange-400',
    ARMS: 'bg-yellow-500/10 text-yellow-400',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[category] ?? 'bg-muted text-muted-foreground'}`}>
      {category}
    </span>
  );
}

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const leaderboard = await api
    .get<LeaderboardExerciseResult[]>(`/gyms/${user.gymId}/leaderboard`)
    .catch(() => [] as LeaderboardExerciseResult[]);

  const pendingCount = await api
    .get<{ length: number }>(`/gyms/${user.gymId}/leaderboard/submissions/pending`)
    .then((r) => (Array.isArray(r) ? r.length : 0))
    .catch(() => 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top personal records by estimated 1-rep max (Epley formula)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Link
              href="/dashboard/leaderboard/pending"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-lg hover:bg-yellow-500/20 transition"
            >
              <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center">
                {pendingCount}
              </span>
              Pending Approvals
            </Link>
          )}
          <Link
            href="/dashboard/leaderboard/config"
            className="px-4 py-2 bg-background border border-border text-sm text-muted-foreground rounded-lg hover:text-foreground hover:border-primary/40 transition"
          >
            Configure
          </Link>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No exercises are enabled for the leaderboard yet.</p>
          <Link
            href="/dashboard/leaderboard/config"
            className="inline-block text-sm text-primary hover:underline"
          >
            Go to Configure →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {leaderboard.map(({ exercise, entries }) => (
            <div key={exercise.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-foreground text-base">{exercise.name}</h2>
                  <CategoryBadge category={exercise.category} />
                </div>
                <Link
                  href={`/dashboard/leaderboard/${exercise.id}`}
                  className="text-xs text-muted-foreground hover:text-primary transition"
                >
                  Full list →
                </Link>
              </div>

              {entries.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No approved PRs yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-background/40">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">Rank</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Athlete</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. 1RM</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifted</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-foreground/5 transition">
                        <td className="px-5 py-3 text-center">
                          {entry.rank === 1 ? (
                            <span className="text-yellow-400 font-bold text-base">🥇</span>
                          ) : entry.rank === 2 ? (
                            <span className="text-slate-300 font-bold text-base">🥈</span>
                          ) : entry.rank === 3 ? (
                            <span className="text-amber-600 font-bold text-base">🥉</span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium text-foreground">
                          {entry.member.user.fullName}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-primary">
                          {Number(entry.estimated1rm).toFixed(1)} kg
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground">
                          {Number(entry.weightKg)} kg × {entry.reps}
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                          {fmtDate(entry.submittedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
