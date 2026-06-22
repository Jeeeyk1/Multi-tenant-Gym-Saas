'use client';

import { useState } from 'react';
import { suspendMember, reactivateMember, renewMember, removeMember } from '@/lib/actions/members';
import { useToast } from '@/components/ui/toast-provider';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { MemberDetail, MembershipPlan } from '@/types/api';

interface Props {
  member: MemberDetail;
  plans: MembershipPlan[];
}

export function MemberActions({ member, plans }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [actionPending, setActionPending] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewPending, setRenewPending] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState(false);

  const activePlans = plans.filter((p) => p.isActive);

  async function handleSuspend() {
    const ok = await confirm({
      title: 'Suspend member?',
      message: 'They will be blocked from checking in until reactivated.',
      confirmLabel: 'Suspend',
      variant: 'destructive',
    });
    if (!ok) return;
    setActionPending('suspend');
    try {
      const result = await suspendMember(member.gymId, member.id);
      if (result.error) toast.error(result.error);
      else toast.success('Member suspended.');
    } finally {
      setActionPending(null);
    }
  }

  async function handleReactivate() {
    setActionPending('reactivate');
    try {
      const result = await reactivateMember(member.gymId, member.id);
      if (result.error) toast.error(result.error);
      else toast.success('Member reactivated.');
    } finally {
      setActionPending(null);
    }
  }

  async function handleRemove() {
    setActionPending('remove');
    try {
      const result = await removeMember(member.gymId, member.id);
      if (result?.error) toast.error(result.error);
    } finally {
      setActionPending(null);
    }
  }

  async function handleRenewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRenewError(null);
    setRenewPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await renewMember(member.gymId, member.id, {}, fd);
      if (result.error) {
        setRenewError(result.error);
      } else {
        setRenewSuccess(true);
        toast.success('Membership renewed successfully.');
        setTimeout(() => {
          setRenewOpen(false);
          setRenewSuccess(false);
        }, 1000);
      }
    } finally {
      setRenewPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Renew — always available */}
        <button
          onClick={() => { setRenewOpen(true); setRenewError(null); setRenewSuccess(false); }}
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
        >
          Renew Membership
        </button>

        {/* Suspend — only when ACTIVE */}
        {member.status === 'ACTIVE' && (
          <button
            onClick={handleSuspend}
            disabled={!!actionPending}
            className="px-4 py-2 text-sm font-medium border border-warning/50 text-warning rounded-lg hover:bg-warning/10 transition disabled:opacity-50"
          >
            {actionPending === 'suspend' ? 'Suspending…' : 'Suspend'}
          </button>
        )}

        {/* Reactivate — when SUSPENDED or EXPIRED */}
        {(member.status === 'SUSPENDED' || member.status === 'EXPIRED') && (
          <button
            onClick={handleReactivate}
            disabled={!!actionPending}
            className="px-4 py-2 text-sm font-medium border border-success/50 text-success rounded-lg hover:bg-success/10 transition disabled:opacity-50"
          >
            {actionPending === 'reactivate' ? 'Reactivating…' : 'Reactivate'}
          </button>
        )}

        {/* Remove — always available, destructive */}
        <button
          onClick={() => setRemoveOpen(true)}
          disabled={!!actionPending}
          className="px-4 py-2 text-sm font-medium border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition disabled:opacity-50 ml-auto"
        >
          Remove Member
        </button>
      </div>

      {/* Remove confirmation dialog */}
      {removeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRemoveOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-2">Remove member?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              This will permanently delete <strong className="text-foreground">{member.user.fullName}</strong>&apos;s membership, check-in history, and all associated data.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              If this is their only gym, their account will also be deleted and the email address <strong className="text-foreground">{member.user.email}</strong> can be reused.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setRemoveOpen(false); handleRemove(); }}
                disabled={actionPending === 'remove'}
                className="flex-1 bg-destructive text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {actionPending === 'remove' ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew dialog */}
      {renewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenewOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Renew Membership</h3>
              <button onClick={() => setRenewOpen(false)} className="text-muted-foreground hover:text-foreground transition text-lg px-1">✕</button>
            </div>

            {renewSuccess ? (
              <p className="text-center text-success font-medium py-4">✓ Renewed successfully</p>
            ) : (
              <form onSubmit={handleRenewSubmit} className="space-y-4">
                {/* Plan (optional) */}
                {activePlans.length > 0 && (
                  <div>
                    <label htmlFor="r-planId" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Plan <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                    </label>
                    <select
                      id="r-planId"
                      name="planId"
                      defaultValue={member.membershipPlan?.id ?? ''}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                    >
                      <option value="">— Keep current plan —</option>
                      {activePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.durationDays}d · ₱{p.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Amount paid */}
                <div>
                  <label htmlFor="r-amount" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Amount Paid (₱) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="r-amount"
                    name="amountPaid"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                {/* Payment method */}
                <div>
                  <label htmlFor="r-method" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Payment Method <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    id="r-method"
                    name="paymentMethod"
                    type="text"
                    placeholder="Cash, GCash, card…"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="r-notes" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Notes <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    id="r-notes"
                    name="notes"
                    rows={2}
                    placeholder="Any notes about this renewal…"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                  />
                </div>

                {renewError && (
                  <p className="text-sm text-destructive">{renewError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRenewOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={renewPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {renewPending ? 'Processing…' : 'Confirm Renewal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
