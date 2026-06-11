'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { togglePlanActive } from '@/lib/actions/plans';
import { PlanModal } from './plan-modal';
import type { MembershipPlan } from '@/types/api';

const TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  STUDENT: 'Student',
  WALK_IN: 'Walk-in',
  DAY_PASS: 'Day Pass',
  CUSTOM: 'Custom',
};

interface Props {
  gymId: string;
  plans: MembershipPlan[];
}

export function PlansClient({ gymId, plans }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<MembershipPlan | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggle(plan: MembershipPlan) {
    setTogglingId(plan.id);
    try {
      await togglePlanActive(gymId, plan.id, !plan.isActive);
    } finally {
      setTogglingId(null);
    }
  }

  const active = plans.filter((p) => p.isActive);
  const inactive = plans.filter((p) => !p.isActive);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} active · {inactive.length} inactive
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          New Plan
        </button>
      </div>

      {/* Plan cards */}
      {plans.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No plans yet. Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active plans */}
          {active.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    toggling={togglingId === p.id}
                    onEdit={() => setEditPlan(p)}
                    onToggle={() => handleToggle(p)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive plans */}
          {inactive.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inactive</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    toggling={togglingId === p.id}
                    onEdit={() => setEditPlan(p)}
                    onToggle={() => handleToggle(p)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      {createOpen && <PlanModal gymId={gymId} onClose={() => setCreateOpen(false)} />}
      {editPlan && <PlanModal gymId={gymId} plan={editPlan} onClose={() => setEditPlan(null)} />}
    </>
  );
}

function PlanCard({
  plan,
  toggling,
  onEdit,
  onToggle,
}: {
  plan: MembershipPlan;
  toggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={cn('bg-surface border rounded-xl p-5 flex flex-col gap-3', plan.isActive ? 'border-border' : 'border-border/50 opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{plan.name}</p>
          <span className="inline-block text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 mt-1">
            {TYPE_LABELS[plan.type] ?? plan.type}
          </span>
        </div>
        <p className="text-lg font-bold text-primary shrink-0">₱{plan.price.toLocaleString()}</p>
      </div>

      <p className="text-sm text-muted-foreground">{plan.durationDays} day{plan.durationDays !== 1 ? 's' : ''}</p>

      {plan.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={onEdit}
          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          className={cn(
            'flex-1 text-xs font-medium px-3 py-1.5 rounded-md border transition disabled:opacity-40',
            plan.isActive
              ? 'border-warning/40 text-warning hover:bg-warning/10'
              : 'border-success/40 text-success hover:bg-success/10',
          )}
        >
          {toggling ? '…' : plan.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
