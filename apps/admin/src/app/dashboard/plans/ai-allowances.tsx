'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/client-api';

export interface BillingPlanCaps {
  id: string;
  name: string;
  tier: string;
  assistantAiCapUsdMicros: number;
  memberAiCapUsdMicros: number;
}

const MICROS_PER_USD = 1_000_000;
const MAX_CAP_USD = 1000;

const toUsd = (micros: number) => (micros / MICROS_PER_USD).toFixed(2);

/** Parses a dollar input. Null when it isn't 0–1000 with at most 2 decimals. */
function parseUsd(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const n = Number(value);
  return n <= MAX_CAP_USD ? n : null;
}

const inputClass =
  'w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary';

function PlanRow({ plan }: { plan: BillingPlanCaps }) {
  const [assistant, setAssistant] = useState(toUsd(plan.assistantAiCapUsdMicros));
  const [members, setMembers] = useState(toUsd(plan.memberAiCapUsdMicros));
  const [saved, setSaved] = useState({ assistant, members });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const dirty = assistant !== saved.assistant || members !== saved.members;

  async function handleSave() {
    const assistantAiCapUsd = parseUsd(assistant);
    const memberAiCapUsd = parseUsd(members);
    if (assistantAiCapUsd === null || memberAiCapUsd === null) {
      setStatus({ kind: 'error', text: `Use a dollar amount from 0 to ${MAX_CAP_USD}.` });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await clientApi.patch(`/api/admin/billing-plans/${plan.id}`, { assistantAiCapUsd, memberAiCapUsd });
      const next = { assistant: assistantAiCapUsd.toFixed(2), members: memberAiCapUsd.toFixed(2) };
      setAssistant(next.assistant);
      setMembers(next.members);
      setSaved(next);
      setStatus({ kind: 'ok', text: 'Saved' });
    } catch (e: unknown) {
      setStatus({ kind: 'error', text: (e as Error).message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-foreground">{plan.name}</p>
        <p className="text-xs text-muted-foreground">{plan.tier}</p>
      </td>
      <td className="py-3 pr-4">
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          $
          <input
            inputMode="decimal"
            value={assistant}
            onChange={(e) => setAssistant(e.target.value)}
            aria-label={`${plan.name} staff assistant allowance in dollars`}
            className={inputClass}
          />
        </label>
      </td>
      <td className="py-3 pr-4">
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          $
          <input
            inputMode="decimal"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            aria-label={`${plan.name} member AI allowance in dollars`}
            className={inputClass}
          />
        </label>
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          {status && (
            <span
              role="status"
              className={`text-xs ${status.kind === 'error' ? 'text-destructive-text' : 'text-muted-foreground'}`}
            >
              {status.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Monthly AI spend allowed per gym on each billing plan. 0 turns that pool off. */
export function AiAllowances({ plans }: { plans: BillingPlanCaps[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-foreground">AI allowances</h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        What each gym can spend on AI per month, by billing plan. Resets on the 1st in the gym&apos;s timezone. Set 0
        to turn a pool off.
      </p>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-4">No active billing plans.</p>
      ) : (
        <div className="mt-4 bg-surface border border-border rounded-xl px-5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Plan</th>
                <th className="py-3 pr-4 font-medium">Staff assistant</th>
                <th className="py-3 pr-4 font-medium">Member AI</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
