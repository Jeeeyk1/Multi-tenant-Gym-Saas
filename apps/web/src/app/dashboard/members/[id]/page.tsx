import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MemberActions } from '@/components/members/member-actions';
import type { MemberDetail, RenewalRecord, MembershipPlan } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'text-success border-success/40 bg-success/10',
  EXPIRED: 'text-destructive border-destructive/40 bg-destructive/10',
  SUSPENDED: 'text-warning border-warning/40 bg-warning/10',
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const [user, { id: memberId }] = await Promise.all([getSessionUser(), params]);
  if (!user) return null;

  const [member, renewals, plans] = await Promise.all([
    api.get<MemberDetail>(`/gyms/${user.gymId}/members/${memberId}`).catch(() => null),
    api.get<RenewalRecord[]>(`/gyms/${user.gymId}/members/${memberId}/renewals`).catch(() => []),
    api.get<MembershipPlan[]>(`/gyms/${user.gymId}/plans`).catch(() => [] as MembershipPlan[]),
  ]);

  if (!member) notFound();

  const statusStyle = STATUS_STYLES[member.status] ?? 'text-muted-foreground border-border';

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
          <h1 className="text-2xl font-bold text-foreground">{member.user.fullName}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{member.membershipNumber}</p>
        </div>
        <span className={cn('ml-auto text-xs font-semibold px-3 py-1 rounded-full border', statusStyle)}>
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
