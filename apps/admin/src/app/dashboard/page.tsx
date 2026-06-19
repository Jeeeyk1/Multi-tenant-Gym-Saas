import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface Stats {
  totalGyms: number;
  totalMembers: number;
  checkInsToday: number;
  activeGyms: number;
  totalUsers: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await api.get<Stats>('/v1/admin/stats').catch(() => null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Platform Overview</h1>
      <p className="text-sm text-muted-foreground mb-8">Real-time snapshot across all gyms.</p>

      {!stats ? (
        <p className="text-muted-foreground text-sm">Could not load stats.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Total Gyms" value={stats.totalGyms} sub={`${stats.activeGyms} active`} />
          <StatCard label="Active Gyms" value={stats.activeGyms} />
          <StatCard label="Total Members" value={stats.totalMembers} />
          <StatCard label="Check-ins Today" value={stats.checkInsToday} />
          <StatCard label="Total Users" value={stats.totalUsers} />
        </div>
      )}
    </div>
  );
}
