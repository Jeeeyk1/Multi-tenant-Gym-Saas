import type { Metadata } from 'next';
import { cloudOfflineOutline, enterOutline } from 'ionicons/icons';
import { EmptyState, StatCard, StatusPill } from '@gym-saas/ui';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { CheckOutButton } from '@/components/dashboard/check-out-button';
import { CheckinsTrendChart } from '@/components/dashboard/checkins-trend-chart';
import { RetryButton } from '@/components/dashboard/retry-button';
import { cn } from '@/lib/utils';
import type { StaffCheckIn, MembersPage, CheckinsTrendPoint } from '@/types/api';

export const metadata: Metadata = { title: 'Dashboard' };

/** A check-in this long is probably a missed check-out, so it is flagged for staff. */
const LONG_STAY_MINUTES = 120;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "+12 vs yesterday", "4 fewer than yesterday", "Same as yesterday". */
function versusYesterday(today: number, yesterday: number) {
  const diff = today - yesterday;
  if (diff === 0) return <span>Same as yesterday</span>;
  return (
    <span>
      <span className={cn('font-semibold', diff > 0 ? 'text-success' : 'text-foreground')}>
        {diff > 0 ? `+${diff}` : diff}
      </span>{' '}
      vs yesterday
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const firstName = user.fullName?.split(' ')[0] ?? user.email;
  const canViewReports = user.permissions.includes('reports.view');

  // allSettled: one failing call shows an error in its own section instead of a misleading 0.
  const [activeRes, membersRes, trendRes] = await Promise.allSettled([
    api.get<StaffCheckIn[]>(`/gyms/${user.gymId}/checkins/active`),
    api.get<MembersPage>(`/gyms/${user.gymId}/members?page=1&limit=1`),
    canViewReports
      ? api.get<CheckinsTrendPoint[]>(`/gyms/${user.gymId}/reports/checkins-trend?days=7`)
      : Promise.resolve([] as CheckinsTrendPoint[]),
  ]);

  const activeCheckIns = activeRes.status === 'fulfilled' ? activeRes.value : null;
  const totalMembers = membersRes.status === 'fulfilled' ? membersRes.value.meta.total : null;
  const trend = trendRes.status === 'fulfilled' ? trendRes.value : null;

  // The trend runs oldest → today, one point per day.
  const today = trend && trend.length ? trend[trend.length - 1].count : null;
  const yesterday = trend && trend.length > 1 ? trend[trend.length - 2].count : null;
  const week = trend ? trend.reduce((sum, p) => sum + p.count, 0) : null;

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 p-4 sm:p-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {getGreeting()}, <span className="font-semibold text-foreground">{firstName}</span> · {dateLabel}
        </p>
        <h1 className="mt-1 font-heading text-heading text-foreground">Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', canViewReports && 'xl:grid-cols-4')}>
        <StatCard
          live
          label="In the gym now"
          value={activeCheckIns ? activeCheckIns.length : '—'}
          sub={activeCheckIns ? (activeCheckIns.length === 1 ? 'member checked in' : 'members checked in') : "Couldn't load"}
        />
        {canViewReports && (
          <StatCard
            label="Check-ins today"
            value={today ?? '—'}
            sub={today !== null && yesterday !== null ? versusYesterday(today, yesterday) : "Couldn't load"}
          />
        )}
        {canViewReports && (
          <StatCard label="Last 7 days" value={week ?? '—'} sub={week !== null ? 'check-ins, including today' : "Couldn't load"} />
        )}
        <StatCard
          label="Members"
          value={totalMembers ?? '—'}
          sub={totalMembers !== null ? 'across all plans' : "Couldn't load"}
        />
      </div>

      {/* Check-ins trend */}
      {canViewReports && trend && <CheckinsTrendChart gymId={user.gymId} initialData={trend} />}

      {/* Who's in right now */}
      <section aria-labelledby="active-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="active-heading" className="text-eyebrow uppercase text-muted">
            In the gym now
          </h2>
          {activeCheckIns && activeCheckIns.length > 0 ? (
            <span className="text-sm text-muted">{activeCheckIns.length} checked in</span>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {activeCheckIns === null ? (
            <EmptyState
              icon={cloudOfflineOutline}
              tone="error"
              title="Couldn't load who's in the gym"
              message="Check your connection and try again."
              action={<RetryButton />}
            />
          ) : activeCheckIns.length === 0 ? (
            <EmptyState
              icon={enterOutline}
              title="No one is checked in right now"
              message="Check-ins from the app, the QR scanner and the front desk appear here as they happen."
            />
          ) : (
            <ul className="divide-y divide-border">
              {activeCheckIns.map((checkin) => {
                const elapsed = elapsedMinutes(checkin.checkedInAt);
                const longStay = elapsed > LONG_STAY_MINUTES;
                return (
                  <li key={checkin.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                      <span className="text-xs font-bold text-primary">{getInitials(checkin.member.user.fullName)}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{checkin.member.user.fullName}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{checkin.member.membershipNumber}</span>
                        {checkin.isOutOfHours && <StatusPill tone="warning">Out of hours</StatusPill>}
                        {longStay && <StatusPill tone="warning">Over 2 hours, missed check-out?</StatusPill>}
                      </div>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className={cn('tabular text-sm font-semibold', longStay ? 'text-warning' : 'text-foreground')}>
                        {formatElapsed(elapsed)}
                      </p>
                      <p className="text-xs text-muted">since {formatTime(checkin.checkedInAt)}</p>
                    </div>

                    <div className="shrink-0">
                      <CheckOutButton gymId={user.gymId} checkinId={checkin.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
