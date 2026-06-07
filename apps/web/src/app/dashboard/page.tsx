import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { CheckOutButton } from '@/components/dashboard/check-out-button';
import { CheckInDialog } from '@/components/dashboard/check-in-dialog';
import { cn } from '@/lib/utils';
import type { StaffCheckIn, MembersPage } from '@/types/api';

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
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={cn('text-4xl font-bold', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </p>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const firstName = user.fullName?.split(' ')[0] ?? user.email;

  const [activeCheckIns, membersPage] = await Promise.all([
    api.get<StaffCheckIn[]>(`/gyms/${user.gymId}/checkins/active`).catch(() => [] as StaffCheckIn[]),
    api.get<MembersPage>(`/gyms/${user.gymId}/members?page=1&limit=1`).catch(() => null),
  ]);

  const totalMembers = membersPage?.meta.total ?? '—';

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-primary font-medium mb-1">
          {getGreeting()}, {firstName}
        </p>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Active Right Now"
          value={activeCheckIns.length}
          sub={activeCheckIns.length === 1 ? 'member in gym' : 'members in gym'}
          accent
        />
        <StatCard
          label="Total Members"
          value={totalMembers}
          sub="enrolled across all plans"
        />
        <StatCard
          label="Today"
          value={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        />
      </div>

      {/* Active check-ins */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Currently Active
          </h2>
          <CheckInDialog gymId={user.gymId} />
        </div>

        {activeCheckIns.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-2xl mb-3">🏋️</p>
            <p className="text-sm text-muted-foreground">No one is checked in right now.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border">
              <div /> {/* avatar */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checked In</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</p>
              <div /> {/* action */}
            </div>

            {/* Rows */}
            <ul className="divide-y divide-border">
              {activeCheckIns.map((checkin) => {
                const elapsed = elapsedMinutes(checkin.checkedInAt);
                return (
                  <li
                    key={checkin.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(checkin.member.user.fullName)}
                      </span>
                    </div>

                    {/* Name + membership # */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {checkin.member.user.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {checkin.member.membershipNumber}
                        {checkin.isOutOfHours && (
                          <span className="ml-2 text-warning">· out-of-hours</span>
                        )}
                      </p>
                    </div>

                    {/* Checked in time */}
                    <p className="text-sm text-muted-foreground hidden sm:block shrink-0">
                      {formatTime(checkin.checkedInAt)}
                    </p>

                    {/* Elapsed */}
                    <p
                      className={cn(
                        'text-sm font-medium shrink-0 hidden sm:block w-14 text-right',
                        elapsed > 120 ? 'text-warning' : 'text-foreground',
                      )}
                    >
                      {formatElapsed(elapsed)}
                    </p>

                    {/* Check out */}
                    <div className="shrink-0">
                      <CheckOutButton gymId={user.gymId} checkinId={checkin.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
