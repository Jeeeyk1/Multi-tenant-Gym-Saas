import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { gyms: number };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default async function OrgPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const org = await api
    .get<OrgDetail>(`/organizations/${user.orgRole || user.organizationId}`)
    .catch(() => null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-primary font-medium mb-1">{user.orgRole} Portal</p>
        <h1 className="text-3xl font-bold text-foreground">{org?.name ?? 'Organization'}</h1>
        {org && (
          <p className="text-sm text-muted-foreground mt-1 font-mono">/{org.slug}</p>
        )}
      </div>

      {/* Stats */}
      {org && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Gyms" value={org._count.gyms} />
          <StatCard label="Status" value={org.status} />
          <StatCard
            label="Member Since"
            value={new Date(org.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          />
        </div>
      )}

      {/* Info */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Organization Details
        </h2>
        {org ? (
          <div className="divide-y divide-border">
            {[
              { label: 'Name', value: org.name },
              { label: 'Slug', value: `/${org.slug}` },
              { label: 'Status', value: org.status },
              { label: 'Gyms', value: `${org._count.gyms} gym${org._count.gyms !== 1 ? 's' : ''}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Could not load organization details.</p>
        )}
      </div>

      {/* Future sections placeholder */}
      <div className="bg-surface border border-border rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Gym management, billing, and settings coming in a future release.
        </p>
      </div>
    </div>
  );
}
