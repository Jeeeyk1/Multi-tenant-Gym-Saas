'use client';

import { Dialog, TextAreaField, TextField, useConfirm, useToast } from '@gym-saas/ui';
import { useState } from 'react';
import { clientApi } from '@/lib/client-api';

export interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  memberLimit: number | null;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  memberLimit: string;
  features: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  priceMonthly: '',
  priceYearly: '',
  memberLimit: '',
  features: '',
  isPopular: false,
  isActive: true,
  sortOrder: '0',
};

function planToForm(p: SaasPlan): FormState {
  return {
    name: p.name,
    description: p.description ?? '',
    priceMonthly: String(p.priceMonthly),
    priceYearly: p.priceYearly != null ? String(p.priceYearly) : '',
    memberLimit: p.memberLimit != null ? String(p.memberLimit) : '',
    features: p.features.join('\n'),
    isPopular: p.isPopular,
    isActive: p.isActive,
    sortOrder: String(p.sortOrder),
  };
}

export function PlansClient({ initialPlans }: { initialPlans: SaasPlan[] }) {
  const [plans, setPlans] = useState<SaasPlan[]>(initialPlans);
  const confirm = useConfirm();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(plan: SaasPlan) {
    setEditId(plan.id);
    setForm(planToForm(plan));
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setError('');
  }

  function buildPayload(f: FormState) {
    return {
      name: f.name.trim(),
      description: f.description.trim() || undefined,
      priceMonthly: parseFloat(f.priceMonthly),
      priceYearly: f.priceYearly ? parseFloat(f.priceYearly) : undefined,
      memberLimit: f.memberLimit ? parseInt(f.memberLimit, 10) : undefined,
      features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
      isPopular: f.isPopular,
      isActive: f.isActive,
      sortOrder: parseInt(f.sortOrder) || 0,
    };
  }

  async function handleSave() {
    if (!form.name.trim() || !form.priceMonthly) {
      setError('Name and monthly price are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(form);
      if (editId) {
        const updated = await clientApi.patch<SaasPlan>(`/api/admin/plans/${editId}`, payload);
        setPlans((prev) => prev.map((p) => (p.id === editId ? updated : p)));
      } else {
        const created = await clientApi.post<SaasPlan>('/api/admin/plans', payload);
        setPlans((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      closeForm();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: 'Delete this plan?', message: 'This cannot be undone.', confirmLabel: 'Delete plan', variant: 'destructive' });
    if (!ok) return;
    try {
      await clientApi.delete(`/api/admin/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success('Plan deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete plan');
    }
  }

  async function toggleActive(plan: SaasPlan) {
    try {
      const updated = await clientApi.patch<SaasPlan>(`/api/admin/plans/${plan.id}`, { isActive: !plan.isActive });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch {
      toast.error('Failed to update plan status');
    }
  }

  return (
    <div>
      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-surface border rounded-xl p-5 flex flex-col gap-3 ${
              plan.isPopular ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
            } ${!plan.isActive ? 'opacity-50' : ''}`}
          >
            {plan.isPopular && (
              <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{plan.name}</h3>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => openEdit(plan)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition"
                  title="Edit"
                  aria-label={`Edit ${plan.name}`}
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive-text hover:bg-destructive/5 transition"
                  title="Delete"
                  aria-label={`Delete ${plan.name}`}
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-foreground">
                ₱{Number(plan.priceMonthly).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {plan.priceYearly && (
                <p className="text-xs text-muted-foreground">₱{Number(plan.priceYearly).toLocaleString('en-PH', { maximumFractionDigits: 0 })}/yr</p>
              )}
              {plan.memberLimit != null && (
                <p className="text-xs text-muted-foreground">Up to {plan.memberLimit.toLocaleString('en-PH')} members</p>
              )}
            </div>

            <ul className="space-y-1">
              {plan.features.slice(0, 5).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
              {plan.features.length > 5 && (
                <li className="text-xs text-muted-foreground pl-5">+{plan.features.length - 5} more</li>
              )}
            </ul>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Sort: {plan.sortOrder}</span>
              <button
                onClick={() => toggleActive(plan)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                  plan.isActive
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                }`}
              >
                {plan.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}

        {/* Add new plan card */}
        <button
          onClick={openCreate}
          className="bg-surface border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition min-h-[200px]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="text-sm font-medium">New Plan</span>
        </button>
      </div>

      <Dialog
        open={showForm}
        onClose={closeForm}
        title={editId ? 'Edit Plan' : 'New Plan'}
        dismissible={!saving}
        footer={
          <>
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : editId ? 'Save changes' : 'Create plan'}
            </button>
          </>
        }
      >
        {error && (
          <div role="alert" className="bg-destructive-bg border border-destructive/30 rounded-lg px-4 py-2 text-sm text-destructive-text">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Plan name"
            className="col-span-2"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Starter"
          />
          <TextAreaField
            label="Description"
            className="col-span-2"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Perfect for small gyms just getting started"
            rows={2}
          />
          <TextField
            label="Monthly price (₱)"
            required
            type="number"
            min="0"
            step="0.01"
            value={form.priceMonthly}
            onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
            placeholder="2499"
          />
          <TextField
            label="Yearly price (₱)"
            type="number"
            min="0"
            step="0.01"
            value={form.priceYearly}
            onChange={(e) => setForm((f) => ({ ...f, priceYearly: e.target.value }))}
            placeholder="24990"
          />
          <TextField
            label="Member limit"
            hint="Shown as “Up to N members”"
            type="number"
            min="1"
            step="1"
            value={form.memberLimit}
            onChange={(e) => setForm((f) => ({ ...f, memberLimit: e.target.value }))}
            placeholder="200"
          />
          <TextAreaField
            label="Features"
            hint="One per line"
            className="col-span-2"
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            placeholder={"Up to 100 members\nMobile app access\nBasic analytics"}
            rows={5}
          />
          <TextField
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />

          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Active (visible on landing)
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Mark as Popular
            </label>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
