import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MemberActions } from '@/components/members/member-actions';
import { AwardBadgeDialog } from '@/components/members/award-badge-dialog';
import { BadgeMedal } from '@/components/badges/badge-medal';
import { BadgeStack } from '@/components/badges/badge-stack';
import { CATEGORY_LABEL, RARITY_LABEL, TIER_LABEL } from '@/components/badges/badge-labels';
import type { BadgeCollection, CollectionBadge, EquippedBadge, MemberDetail, RenewalRecord, MembershipPlan, GymCustomBadge } from '@/types/api';

export const metadata: Metadata = { title: 'Member' };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'text-success border-success/40 bg-success-bg',
  EXPIRED: 'text-destructive-text border-destructive/40 bg-destructive-bg',
  SUSPENDED: 'text-warning border-warning/40 bg-warning-bg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground text-right">{value}</p>
    </div>
  );
}

function EarnedBadgeRow({ badge }: { badge: CollectionBadge }) {
  const earned = badge.earned!;
  return (
    <li className={cn('px-5 py-3 flex items-center gap-4', earned.expired && 'opacity-50')}>
      <BadgeMedal category={badge.category} tier={badge.tier} color={badge.color} icon={badge.icon} size={36} rarity={earned.expired ? null : badge.rarity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {badge.name}
          {earned.isEquipped && !earned.expired && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Equipped</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {[
            badge.tier && TIER_LABEL[badge.tier],
            badge.rarity && RARITY_LABEL[badge.rarity],
            badge.description,
            badge.timesEarned > 1 && `Earned ${badge.timesEarned} times`,
            earned.expired && 'Expired',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <p className="text-xs text-muted-foreground shrink-0">
        {new Date(earned.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </li>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const [user, { id: memberId }] = await Promise.all([getSessionUser(), params]);
  if (!user) return null;
  if (!user.permissions.includes('members.view')) redirect('/dashboard');

  const canAward = user.permissions?.includes('badges.award') ?? false;

  const [member, renewals, plans, collection, customBadges] = await Promise.all([
    api.get<MemberDetail>(`/gyms/${user.gymId}/members/${memberId}`).catch(() => null),
    api.get<RenewalRecord[]>(`/gyms/${user.gymId}/members/${memberId}/renewals`).catch(() => []),
    api.get<MembershipPlan[]>(`/gyms/${user.gymId}/plans`).catch(() => [] as MembershipPlan[]),
    api.get<BadgeCollection>(`/gyms/${user.gymId}/members/${memberId}/badges/collection`).catch(() => null),
    canAward
      ? api.get<GymCustomBadge[]>(`/gyms/${user.gymId}/badges/custom`).catch(() => [] as GymCustomBadge[])
      : Promise.resolve([] as GymCustomBadge[]),
  ]);

  if (!member) notFound();

  const statusStyle = STATUS_STYLES[member.status] ?? 'text-muted-foreground border-border';
  const equipped: EquippedBadge[] = (collection?.categories ?? []).flatMap(({ equipped: b }) =>
    b?.earned
      ? [{
          memberBadgeId: b.earned.memberBadgeId,
          key: b.key,
          awardedAt: b.earned.awardedAt,
          category: b.category,
          name: b.name,
          description: b.description,
          icon: b.icon,
          color: b.color,
          tier: b.tier,
          rarity: b.rarity,
        }]
      : [],
  );

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/dashboard/members" className="text-sm text-primary hover:underline">
        ← Members
      </Link>

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{getInitials(member.user.fullName)}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{member.user.fullName}</h1>
            <BadgeStack badges={equipped} size={24} />
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{member.membershipNumber}</p>
        </div>
        <span className={cn('ml-auto text-xs font-semibold px-3 py-1 rounded-pill border', statusStyle)}>
          {member.status}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-surface border border-border rounded-xl px-5 py-1">
        <InfoRow label="Email" value={member.user.email} />
        <InfoRow label="Phone" value={member.user.phone ?? '—'} />
        <InfoRow label="Plan" value={member.membershipPlan?.name ?? '—'} />
        <InfoRow
          label="Expiry"
          value={new Date(member.expiryDate).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
        />
        <InfoRow
          label="Joined"
          value={new Date(member.joinedAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
        />
      </div>

      {/* Actions */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions</p>
        <MemberActions member={member} plans={plans} />
      </div>

      {/* Badges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Badges
          </h2>
          {canAward && (
            <AwardBadgeDialog gymId={user.gymId} memberId={memberId} customBadges={customBadges} />
          )}
        </div>
        {collection === null ? (
          <div className="bg-surface border border-border rounded-xl">
            <p className="text-sm text-muted-foreground py-8 text-center">Could not load this member&apos;s badges.</p>
          </div>
        ) : collection.earnedCount === 0 ? (
          <div className="bg-surface border border-border rounded-xl">
            <p className="text-sm text-muted-foreground py-8 text-center">No badges earned yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {collection.earnedCount} of {collection.totalCount} badges earned
            </p>
            {collection.categories.map(({ category, badges }) => {
              const earned = badges.filter((b) => b.earned);
              if (earned.length === 0) return null;
              return (
                <div key={category} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <p className="px-5 pt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABEL[category]}
                  </p>
                  <ul className="divide-y divide-border">
                    {earned.map((b) => <EarnedBadgeRow key={b.key} badge={b} />)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Renewal history */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Renewal History
        </h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No renewals yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {renewals.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      ₱{r.amountPaid.toLocaleString()}
                      {r.paymentMethod && (
                        <span className="text-muted-foreground font-normal"> · {r.paymentMethod}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.previousExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' → '}
                      {new Date(r.newExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{r.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.renewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.renewedByUser.fullName}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
