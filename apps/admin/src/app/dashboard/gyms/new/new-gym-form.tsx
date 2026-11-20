'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BillingPlan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number | null;
}

interface SignupRequest {
  id: string;
  gymName: string;
  ownerName: string;
  email: string;
  planInterest: string | null;
}

function formatPhp(amount: number): string {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function NewGymForm({ plans, leadId, lead }: { plans: BillingPlan[]; leadId?: string; lead?: SignupRequest | null }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inviteToken: string; gymId: string; isTrial: boolean; trialDays: number } | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const planId = fd.get('planId') as string;
    if (!planId) { setError('Please select a plan'); setIsPending(false); return; }
    try {
      const res = await fetch('/api/admin/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: fd.get('gymName'),
          gymCode: (fd.get('gymCode') as string).toUpperCase(),
          ownerEmail: fd.get('ownerEmail'),
          ownerFullName: fd.get('ownerFullName'),
          planId,
          billingCycle,
          ...(isTrial ? { trialDays } : {}),
        }),
      });
      const json = await res.json() as { error?: string; inviteToken?: string; gymId?: string };
      if (!res.ok || json.error) { setError(json.error ?? 'Failed to create gym'); return; }

      if (leadId) {
        // Best-effort — the gym is already created either way; don't block on this.
        await fetch(`/api/admin/signup-requests/${leadId}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gymId: json.gymId }),
        }).catch(() => {});
      }

      setResult({ inviteToken: json.inviteToken!, gymId: json.gymId!, isTrial, trialDays });
    } catch {
      setError('Could not reach server');
    } finally {
      setIsPending(false);
    }
  }

  if (result) {
    const activationUrl = `${window.location.origin.replace(':9003', ':9002')}/activate?token=${result.inviteToken}`;
    return (
      <div className="p-8 max-w-lg">
        <div className="bg-success/10 border border-success/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Gym created!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Share this activation link with the gym owner so they can set their password.{' '}
            {result.isTrial
              ? `The gym is on a ${result.trialDays}-day free trial — fully usable right away, no payment yet. When the trial ends it will ask for payment (you can also extend it anytime from the gym's page).`
              : 'Their first invoice is already waiting for them — the gym stays locked until they pay.'}
          </p>
          <code className="block text-xs bg-background border border-border rounded-lg p-3 break-all text-primary">
            {activationUrl}
          </code>
          <p className="text-xs text-muted-foreground mt-3">Link expires in 7 days.</p>
          <button
            onClick={() => router.push('/dashboard/gyms')}
            className="mt-4 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            Back to gyms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-1">Invite Gym Client</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Creates the gym, provisions a subscription on the selected plan, and sends the owner an
        activation link to set their password.
      </p>

      {lead && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-5 text-sm">
          <p className="text-foreground font-medium">Converting a signup request</p>
          <p className="text-muted-foreground mt-0.5">
            {lead.email}{lead.planInterest && ` · interested in ${lead.planInterest}`} — fields
            below are pre-filled; just add a gym code and confirm the plan.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface border border-border rounded-xl p-6">
        {[
          { name: 'gymName', label: 'Gym Name', placeholder: 'Iron Paradise Gym', type: 'text', defaultValue: lead?.gymName },
          { name: 'gymCode', label: 'Gym Code', placeholder: 'IRONPRD (3–12 uppercase)', type: 'text', defaultValue: undefined },
          { name: 'ownerFullName', label: 'Owner Full Name', placeholder: 'Juan dela Cruz', type: 'text', defaultValue: lead?.ownerName },
          { name: 'ownerEmail', label: 'Owner Email', placeholder: 'juan@ironparadise.com', type: 'email', defaultValue: lead?.email },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              {f.label}
            </label>
            <input
              name={f.name}
              type={f.type}
              placeholder={f.placeholder}
              defaultValue={f.defaultValue}
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              disabled={isPending}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            Plan
          </label>
          {plans.length === 0 ? (
            <p className="text-sm text-destructive">No active billing plans found. Seed the `plans` table first.</p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="planId" value={plan.id} required disabled={isPending} />
                    <span className="text-sm font-medium text-foreground">{plan.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatPhp(plan.priceMonthly)}/mo
                    {plan.priceYearly != null && ` · ${formatPhp(plan.priceYearly)}/yr`}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            Billing cycle
          </label>
          <div className="flex gap-2">
            {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                disabled={isPending}
                className={`flex-1 text-sm font-medium py-2 rounded-lg border transition ${
                  billingCycle === cycle
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-foreground/5'
                }`}
              >
                {cycle === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                disabled={isPending}
              />
              <span className="text-sm font-medium text-foreground">Start as free trial</span>
            </span>
            <span className="text-xs text-muted-foreground">usable now · no invoice yet</span>
          </label>
          {isTrial && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                disabled={isPending}
                className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
              <span className="text-sm text-muted-foreground">trial days (converts to the plan above when it ends)</span>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-foreground/5 transition"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || plans.length === 0}
            className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
          >
            {isPending ? 'Creating…' : 'Create & Get Invite Link'}
          </button>
        </div>
      </form>
    </div>
  );
}
