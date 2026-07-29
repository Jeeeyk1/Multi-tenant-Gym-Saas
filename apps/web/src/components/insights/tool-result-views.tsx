import { cn } from '@/lib/utils';

function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface MemberRow {
  memberId: string;
  name: string;
  membershipNumber: string;
  status: string;
}

function asMemberList(data: unknown): MemberRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const ok = data.every((r) => isRecord(r) && typeof r.name === 'string' && typeof r.membershipNumber === 'string');
  return ok ? (data as MemberRow[]) : null;
}

interface CheckinStatus {
  found: boolean;
  member?: string;
  date?: string;
  checkedIn?: boolean;
  count?: number;
  lastCheckInAt?: string | null;
}

function asCheckinStatus(data: unknown): CheckinStatus | null {
  return isRecord(data) && typeof data.found === 'boolean' ? (data as unknown as CheckinStatus) : null;
}

function asMetric(data: unknown): { value: number } | { groupedBy: string; rows: { group: string; value: number }[] } | null {
  if (!isRecord(data)) return null;
  if (typeof data.value === 'number') return { value: data.value };
  if (typeof data.groupedBy === 'string' && Array.isArray(data.rows)) {
    return data as { groupedBy: string; rows: { group: string; value: number }[] };
  }
  return null;
}

function asTrend(data: unknown): { rows: { period: string; value: number }[] } | null {
  if (isRecord(data) && Array.isArray(data.rows)) return data as { rows: { period: string; value: number }[] };
  return null;
}

interface PlanRow {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

function asPlanList(data: unknown): PlanRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const ok = data.every((r) => isRecord(r) && typeof r.name === 'string' && typeof r.price === 'number');
  return ok ? (data as PlanRow[]) : null;
}

function asActionResult(data: unknown): Record<string, unknown> | null {
  return isRecord(data) && data.ok === true ? data : null;
}

/** Renders a tool's structured result as UI instead of leaving it as prose. Returns null for
 * shapes it doesn't recognize, so the caller can fall back to plain text. */
export function ToolResultView({ tool, data }: { tool: string; data: unknown }) {
  switch (tool) {
    case 'find_member': {
      const rows = asMemberList(data);
      return rows ? <MemberListCard rows={rows} /> : null;
    }
    case 'get_member_checkin_status': {
      const status = asCheckinStatus(data);
      return status ? <CheckinStatusCard status={status} /> : null;
    }
    case 'query_metric': {
      const metric = asMetric(data);
      return metric ? <MetricCard metric={metric} /> : null;
    }
    case 'get_trend': {
      const trend = asTrend(data);
      return trend ? <TrendCard rows={trend.rows} /> : null;
    }
    case 'list_membership_plans': {
      const plans = asPlanList(data);
      return plans ? <PlanListCard rows={plans} /> : null;
    }
    case 'register_member':
    case 'renew_membership':
    case 'suspend_member':
    case 'reactivate_member': {
      const result = asActionResult(data);
      return result ? <ActionConfirmedCard tool={tool} result={result} /> : null;
    }
    default:
      return null;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background border border-border rounded-xl px-4 py-3 text-sm max-w-md">
      {children}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  EXPIRED: 'bg-destructive',
  SUSPENDED: 'bg-yellow-500',
};

function MemberListCard({ rows }: { rows: MemberRow[] }) {
  return (
    <Card>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.memberId} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-foreground font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{r.membershipNumber}</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[r.status] ?? 'bg-muted-foreground')} />
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CheckinStatusCard({ status }: { status: CheckinStatus }) {
  if (!status.found) {
    return <Card><p className="text-muted-foreground">Member not found.</p></Card>;
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-medium">{status.member}</p>
          <p className="text-xs text-muted-foreground">{status.date}</p>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            status.checkedIn ? 'bg-success/10 text-success' : 'bg-foreground/5 text-muted-foreground',
          )}
        >
          {status.checkedIn ? `Checked in · ${status.count}` : 'Not checked in'}
        </span>
      </div>
    </Card>
  );
}

function MetricCard({ metric }: { metric: { value: number } | { groupedBy: string; rows: { group: string; value: number }[] } }) {
  if ('value' in metric) {
    return (
      <Card>
        <p className="text-2xl font-bold text-foreground tabular-nums">{metric.value.toLocaleString()}</p>
      </Card>
    );
  }
  const max = Math.max(...metric.rows.map((r) => r.value), 1);
  return (
    <Card>
      <ul className="space-y-2">
        {metric.rows.map((r) => (
          <li key={r.group} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{r.group}</span>
            <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-foreground tabular-nums w-10 text-right">{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function shortDate(period: string): string {
  const d = new Date(`${period}T00:00:00`);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// At most three labels (start / middle / end) so the axis never crams dates together,
// no matter how many data points the trend has.
function pickAxisLabels(rows: { period: string }[]): string[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [shortDate(rows[0].period)];
  if (rows.length === 2) return [shortDate(rows[0].period), shortDate(rows[1].period)];
  return [
    shortDate(rows[0].period),
    shortDate(rows[Math.floor(rows.length / 2)].period),
    shortDate(rows[rows.length - 1].period),
  ];
}

function TrendCard({ rows }: { rows: { period: string; value: number }[] }) {
  const W = 300;
  const H = 72;
  const PAD = 4;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const n = rows.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const points = rows.map((r, i) => `${x(i).toFixed(1)},${y(r.value).toFixed(1)}`);
  const line = `M${points.join(' L')}`;
  const area = `${line} L${W},${H} L0,${H} Z`;
  const labels = pickAxisLabels(rows);
  const latest = rows[n - 1];

  return (
    <Card>
      {latest && (
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-lg font-bold text-foreground tabular-nums">{latest.value.toLocaleString()}</span>
          <span className="text-[11px] text-muted-foreground">latest</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="insights-trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#insights-trend-grad)" />
        <path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </Card>
  );
}

function PlanListCard({ rows }: { rows: PlanRow[] }) {
  return (
    <Card>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span className="text-foreground font-medium">{r.name}</span>
            <span className="text-xs text-muted-foreground">{formatPhp(r.price)} · {r.durationDays}d</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const ACTION_LABEL: Record<string, string> = {
  register_member: 'Member invited',
  renew_membership: 'Membership renewed',
  suspend_member: 'Member suspended',
  reactivate_member: 'Member reactivated',
};

function ActionConfirmedCard({ tool, result }: { tool: string; result: Record<string, unknown> }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span className="font-medium text-foreground">{ACTION_LABEL[tool] ?? 'Done'}</span>
      </div>
      {typeof result.invitedEmail === 'string' && (
        <p className="text-xs text-muted-foreground mt-1">{result.invitedEmail}</p>
      )}
    </Card>
  );
}
