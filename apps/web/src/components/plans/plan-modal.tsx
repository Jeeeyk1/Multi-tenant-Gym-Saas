'use client';

import { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Edit Plan' : 'New Membership Plan'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition text-lg px-1">
            ✕
          </button>
        </div>

        {success ? (
          <p className="text-center text-success font-medium py-6">
            ✓ Plan {isEdit ? 'updated' : 'created'} successfully
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Plan Name <span className="text-destructive">*</span>
              </label>
              <input
                name="name"
                type="text"
                defaultValue={plan?.name}
                placeholder="e.g. Monthly Unlimited"
                required
                disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                name="type"
                defaultValue={plan?.type ?? ''}
                required
                disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              >
                <option value="" disabled>Select type…</option>
                {PLAN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Price + Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Price (₱) <span className="text-destructive">*</span>
                </label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plan?.price}
                  placeholder="0.00"
                  required
                  disabled={isPending}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Duration (days) <span className="text-destructive">*</span>
                </label>
                <input
                  name="durationDays"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={plan?.durationDays}
                  placeholder="30"
                  required
                  disabled={isPending}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Description <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <textarea
                name="description"
                rows={2}
                defaultValue={plan?.description ?? ''}
                placeholder="Short description of what's included…"
                disabled={isPending}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-950/60 border border-destructive rounded-lg px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
