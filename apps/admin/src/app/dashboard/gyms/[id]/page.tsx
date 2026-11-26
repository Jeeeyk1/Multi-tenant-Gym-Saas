import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { GymStatusToggle } from './status-toggle';
import { ResendInviteButton } from './resend-invite-button';
import { ExtendTrialButton } from './extend-trial-button';
import { GymStatus } from '@gym-saas/contracts';
import { GymAvatar, StatusTag, type Tone } from '@/components/gyms/gym-avatar';
import { MemberAppPreview } from '@/components/gyms/member-app-preview';

export const metadata: Metadata = { title: 'Gym' };

type SubscriptionStatus = 'PENDING_PAYMENT' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

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
  subscription: { status: SubscriptionStatus; currentPeriodEnd: string } | null;
  activeMemberCount: number;
  memberCap: number | null;
}

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  TRIALING: 'Trialing',
  ACTIVE: 'Active',
  PAST_DUE: 'Past Due',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};

const SUBSCRIPTION_TONE: Record<SubscriptionStatus, Tone> = {
  PENDING_PAYMENT: 'orange',
  TRIALING: 'blue',
  ACTIVE: 'green',
  PAST_DUE: 'orange',
  SUSPENDED: 'orange',
  CANCELLED: 'grey',
};

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
          <GymAvatar name={gym.name} logoUrl={gym.profile?.logoUrl} accent={gym.profile?.primaryColor} size={56} />
          <div>
            <p className="text-[13px] text-muted-foreground">FitOps</p>
            <h1 className="text-2xl text-foreground">{gym.name}</h1>
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

      {gym.subscription && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gym.subscription.status === 'TRIALING'
                  ? `Trial ends ${formatDate(gym.subscription.currentPeriodEnd)}`
                  : gym.subscription.status === 'PENDING_PAYMENT'
                    ? 'Locked — awaiting payment'
                    : `Renews ${formatDate(gym.subscription.currentPeriodEnd)}`}
              </p>
            </div>
            <StatusTag tone={SUBSCRIPTION_TONE[gym.subscription.status]}>
              {SUBSCRIPTION_LABEL[gym.subscription.status]}
            </StatusTag>
          </div>
          {(gym.subscription.status === 'TRIALING' || gym.subscription.status === 'PENDING_PAYMENT') && (
            <ExtendTrialButton gymId={gym.id} lapsed={gym.subscription.status === 'PENDING_PAYMENT'} />
          )}

          <MemberCapUsage activeCount={gym.activeMemberCount} cap={gym.memberCap} />

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Invoice issuer</span>
            <span className="text-xs font-semibold text-foreground">VerSolutions</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <MemberAppPreview name={gym.name} logoUrl={gym.profile?.logoUrl} accent={gym.profile?.primaryColor} />
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
          <StatusTag tone={gym.ownerActivated ? 'green' : 'orange'}>
            {gym.ownerActivated ? 'Activated' : 'Pending'}
          </StatusTag>
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

function MemberCapUsage({ activeCount, cap }: { activeCount: number; cap: number | null }) {
  if (cap === null) {
    return (
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Active members</span>
        <span className="text-xs font-semibold text-foreground">{activeCount} · Unlimited</span>
      </div>
    );
  }

  const ratio = activeCount / cap;
  const barColor = ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-yellow-500' : 'bg-success';
  const textColor = ratio >= 1 ? 'text-destructive' : ratio >= 0.8 ? 'text-yellow-500' : 'text-foreground';

  return (
    <div className="pt-3 border-t border-border space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Active members</span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {activeCount} / {cap}
          {ratio >= 1 && ' · Over plan cap'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}
