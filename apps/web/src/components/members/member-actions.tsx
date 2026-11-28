'use client';

import { useState } from 'react';
import { Dialog } from '@gym-saas/ui';
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

  // A deleted account is kept only for the gym's records; the API refuses changes to it.
  if (member.status === 'DELETED') {
    return <p className="text-sm text-muted-foreground">This member deleted their account. Their payment and attendance history is kept.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Renew — always available */}
        <button
          onClick={() => { setRenewOpen(true); setRenewError(null); setRenewSuccess(false); }}
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Renew Membership
        </button>

        {/* Suspend — only when ACTIVE */}
        {member.status === 'ACTIVE' && (
          <button
            onClick={handleSuspend}
            disabled={!!actionPending}
            className="px-4 py-2 text-sm font-semibold bg-surface border border-warning/50 text-warning rounded-md hover:bg-warning-bg transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {actionPending === 'suspend' ? 'Suspending…' : 'Suspend'}
          </button>
        )}

        {/* Reactivate — when SUSPENDED or EXPIRED */}
        {(member.status === 'SUSPENDED' || member.status === 'EXPIRED') && (
          <button
            onClick={handleReactivate}
            disabled={!!actionPending}
            className="px-4 py-2 text-sm font-semibold bg-surface border border-success/50 text-success rounded-md hover:bg-success-bg transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {actionPending === 'reactivate' ? 'Reactivating…' : 'Reactivate'}
          </button>
        )}

        {/* Remove — always available, destructive */}
        <button
          onClick={() => setRemoveOpen(true)}
          disabled={!!actionPending}
          className="px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition disabled:opacity-50 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Remove Member
        </button>
      </div>

      <Dialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove member?"
        size="sm"
        description={
          <div className="space-y-1">
            <p>
              This will permanently delete <strong className="text-foreground">{member.user.fullName}</strong>&apos;s membership, check-in history, and all associated data.
            </p>
            <p>
              If this is their only gym, their account will also be deleted and the email address <strong className="text-foreground">{member.user.email}</strong> can be reused.
            </p>
          </div>
        }
      >
        <div className="flex gap-3">
          <button
            onClick={() => setRemoveOpen(false)}
            className="bg-surface flex-1 px-4 py-2.5 text-sm rounded-md border border-border text-foreground hover:text-foreground transition font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={() => { setRemoveOpen(false); handleRemove(); }}
            disabled={actionPending === 'remove'}
            className="flex-1 bg-destructive text-destructive-foreground font-semibold py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {actionPending === 'remove' ? 'Removing…' : 'Yes, remove'}
          </button>
        </div>
      </Dialog>

      {/* Renew dialog */}
      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew Membership" size="sm" dismissible={!renewPending}>

        {renewSuccess ? (
          <p role="status" className="text-center text-success font-medium py-4">✓ Renewed successfully</p>
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
                  className="w-full bg-surface py-2.5 border border-border rounded-md px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
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
                className="w-full bg-surface py-2.5 border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
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
                className="w-full bg-surface py-2.5 border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
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
                className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition resize-none"
              />
            </div>

            {renewError && (
              <p role="alert" className="text-sm text-destructive-text">{renewError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRenewOpen(false)}
                className="bg-surface flex-1 px-4 py-2.5 text-sm rounded-md border border-border text-foreground hover:text-foreground transition font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={renewPending}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {renewPending ? 'Processing…' : 'Confirm Renewal'}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
