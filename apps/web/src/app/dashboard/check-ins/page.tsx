import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckOutButton } from '@/components/dashboard/check-out-button';
import { CheckInDialog } from '@/components/dashboard/check-in-dialog';
import type { StaffCheckIn, CheckInsPage } from '@/types/api';

const METHOD_LABELS: Record<string, string> = {
  MANUAL_STAFF: 'Staff',
  QR_STAFF_SCAN: 'QR Scan',
  QR_SELF_SCAN: 'QR Self',
  APP_SELF_CHECKIN: 'App',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function formatDuration(inIso: string, outIso: string | null | undefined): string {
  const end = outIso ? new Date(outIso).getTime() : Date.now();
  const mins = Math.floor((end - new Date(inIso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function CheckInsPage({ searchParams }: Props) {
  const [user, { page: pageParam }] = await Promise.all([getSessionUser(), searchParams]);
  if (!user) return null;

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const [active, history] = await Promise.all([
    api.get<StaffCheckIn[]>(`/gyms/${user.gymId}/checkins/active`).catch(() => [] as StaffCheckIn[]),
    api.get<CheckInsPage>(`/gyms/${user.gymId}/checkins?page=${page}&limit=25`).catch(() => null),
  ]);

  const historyItems = history?.data ?? [];
  const meta = history?.meta ?? { total: 0, page: 1, limit: 25, totalPages: 1 };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Check-ins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.length} active now · {meta.total} total recorded
          </p>
        </div>
        <CheckInDialog gymId={user.gymId} />
      </div>

      {/* Active now */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Currently Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No one is checked in right now.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border">
              <div />
              {['Member', 'Method', 'Checked In', 'Duration', ''].map((h) => (
                <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <ul className="divide-y divide-border">
              {active.map((c) => {
                const elapsed = elapsedMinutes(c.checkedInAt);
                return (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{getInitials(c.member.user.fullName)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/members/${c.member.id}`} className="text-sm font-medium text-foreground hover:text-primary transition truncate block">
                        {c.member.user.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.member.membershipNumber}
                        {c.isOutOfHours && <span className="ml-2 text-warning">· out-of-hours</span>}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hidden sm:inline shrink-0">
                      {METHOD_LABELS[c.method] ?? c.method}
                    </span>
                    <p className="text-sm text-muted-foreground hidden sm:block shrink-0">{formatTime(c.checkedInAt)}</p>
                    <p className={cn('text-sm font-medium hidden sm:block shrink-0 w-14 text-right', elapsed > 120 ? 'text-warning' : 'text-foreground')}>
                      {formatDuration(c.checkedInAt, null)}
                    </p>
                    <div className="shrink-0">
                      <CheckOutButton gymId={user.gymId} checkinId={c.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          History
        </h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border">
            <div />
            {['Member', 'Method', 'Date', 'Duration', 'Status'].map((h) => (
              <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {historyItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No check-in history yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {historyItems.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{getInitials(c.member.user.fullName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/members/${c.member.id}`} className="text-sm font-medium text-foreground hover:text-primary transition truncate block">
                      {c.member.user.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.member.membershipNumber}
                      {c.isOutOfHours && <span className="ml-2 text-warning">· out-of-hours</span>}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hidden sm:inline shrink-0">
                    {METHOD_LABELS[c.method] ?? c.method}
                  </span>
                  <p className="text-sm text-muted-foreground hidden sm:block shrink-0 whitespace-nowrap">
                    {formatDateTime(c.checkedInAt)}
                  </p>
                  <p className="text-sm text-muted-foreground hidden sm:block shrink-0 w-14 text-right">
                    {formatDuration(c.checkedInAt, c.checkedOutAt)}
                  </p>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline',
                    c.checkedOutAt
                      ? c.isAutoCheckout
                        ? 'text-muted-foreground border-border'
                        : 'text-success border-success/40 bg-success/10'
                      : 'text-primary border-primary/40 bg-primary/10',
                  )}>
                    {c.checkedOutAt ? (c.isAutoCheckout ? 'Auto' : 'Out') : 'Active'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/dashboard/check-ins?page=${page - 1}`} className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition">
                  ← Prev
                </Link>
              )}
              {page < meta.totalPages && (
                <Link href={`/dashboard/check-ins?page=${page + 1}`} className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
