import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { GymStatusToggle } from './status-toggle';
import { ResendInviteButton } from './resend-invite-button';
import { GymStatus } from '@gym-saas/contracts';

interface GymDetail {
  id: string;
  name: string;
  code: string;
  status: GymStatus;
  address: string | null;
  city: string | null;
  country: string;
  timezone: string;
  createdAt: string;
  ownerActivated: boolean;
  organization: { id: string; name: string; slug: string };
  profile: { logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null; description: string | null } | null;
  _count: { members: number; staff: number; checkIns: number };
}

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gym = await api.get<GymDetail>(`/v1/admin/gyms/${id}`).catch(() => null);
  if (!gym) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/gyms" className="text-xs text-muted-foreground hover:text-primary mb-6 inline-block">
        ← All gyms
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {gym.profile?.logoUrl ? (
            <img src={gym.profile.logoUrl} alt="" className="w-14 h-14 rounded-xl object-contain border border-border bg-surface" />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-black"
              style={{ backgroundColor: gym.profile?.primaryColor ?? '#6EE7B7' }}
            >
              {gym.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{gym.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{gym.code}</p>
          </div>
        </div>
        <GymStatusToggle gymId={gym.id} currentStatus={gym.status} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Members', value: gym._count.members },
          { label: 'Staff', value: gym._count.staff },
          { label: 'Total Check-ins', value: gym._count.checkIns },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3 text-sm">
        <Row label="Organization" value={gym.organization.name} />
        <Row label="Status" value={gym.status} />
        <Row label="Location" value={[gym.city, gym.country].filter(Boolean).join(', ') || '—'} />
        <Row label="Timezone" value={gym.timezone} />
        <Row label="Created" value={formatDate(gym.createdAt)} />
        {gym.profile?.description && <Row label="Description" value={gym.profile.description} />}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Owner Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {gym.ownerActivated
                ? 'The owner has activated their account.'
                : 'The owner has not yet activated their account.'}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            gym.ownerActivated
              ? 'bg-success/10 text-success'
              : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {gym.ownerActivated ? 'Activated' : 'Pending'}
          </span>
        </div>
        {!gym.ownerActivated && <ResendInviteButton gymId={gym.id} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
