'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/client-api';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
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
    features: p.features.join('\n'),
    isPopular: p.isPopular,
    isActive: p.isActive,
    sortOrder: String(p.sortOrder),
  };
}

export function PlansClient({ initialPlans }: { initialPlans: SaasPlan[] }) {
  const [plans, setPlans] = useState<SaasPlan[]>(initialPlans);
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
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await clientApi.delete(`/api/admin/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete plan');
    }
  }

  async function toggleActive(plan: SaasPlan) {
    try {
      const updated = await clientApi.patch<SaasPlan>(`/api/admin/plans/${plan.id}`, { isActive: !plan.isActive });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch {
      alert('Failed to update plan status');
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
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-foreground">
                ${Number(plan.priceMonthly).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {plan.priceYearly && (
                <p className="text-xs text-muted-foreground">${Number(plan.priceYearly).toFixed(0)}/yr</p>
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{editId ? 'Edit Plan' : 'New Plan'}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Plan name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Starter"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Perfect for small gyms just getting started"
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Monthly price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceMonthly}
                    onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
                    placeholder="49"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Yearly price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceYearly}
                    onChange={(e) => setForm((f) => ({ ...f, priceYearly: e.target.value }))}
                    placeholder="490"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Features <span className="text-muted-foreground font-normal">(one per line)</span>
                  </label>
                  <textarea
                    value={form.features}
                    onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                    placeholder={"Up to 100 members\nMobile app access\nBasic analytics"}
                    rows={5}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

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
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
