'use client';

import { useState } from 'react';
import { Dialog, SelectField, TextAreaField, TextField } from '@gym-saas/ui';
import { createPlan, updatePlan } from '@/lib/actions/plans';
import type { MembershipPlan } from '@/types/api';

const PLAN_TYPES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'DAY_PASS', label: 'Day Pass' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface Props {
  gymId: string;
  plan?: MembershipPlan;
  onClose: () => void;
}

export function PlanModal({ gymId, plan, onClose }: Props) {
  const isEdit = !!plan;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = isEdit
        ? await updatePlan(gymId, plan.id, {}, fd)
        : await createPlan(gymId, {}, fd);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 800);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={isEdit ? 'Edit Plan' : 'New Membership Plan'} dismissible={!isPending}>
      {success ? (
        <p role="status" className="text-center text-success font-medium py-6">
          ✓ Plan {isEdit ? 'updated' : 'created'} successfully
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Plan name"
            name="name"
            type="text"
            defaultValue={plan?.name}
            placeholder="e.g. Monthly Unlimited"
            required
            disabled={isPending}
          />

          <SelectField label="Type" name="type" defaultValue={plan?.type ?? ''} required disabled={isPending}>
            <option value="" disabled>Select type…</option>
            {PLAN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Price (₱)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={plan?.price}
              placeholder="0.00"
              required
              disabled={isPending}
            />
            <TextField
              label="Duration (days)"
              name="durationDays"
              type="number"
              min="1"
              step="1"
              defaultValue={plan?.durationDays}
              placeholder="30"
              required
              disabled={isPending}
            />
          </div>

          <TextAreaField
            label="Description"
            hint="Optional"
            name="description"
            rows={2}
            defaultValue={plan?.description ?? ''}
            placeholder="Short description of what's included…"
            disabled={isPending}
          />

          {error && (
            <div role="alert" className="bg-destructive-bg border border-destructive rounded-md px-3 py-2">
              <p className="text-sm text-destructive-text">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="bg-surface flex-1 px-4 py-2.5 text-sm rounded-md border border-border text-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-50 font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
