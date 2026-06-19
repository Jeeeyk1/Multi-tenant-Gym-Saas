'use client';

import { useState } from 'react';
import { createCustomBadge, createMilestoneBadge } from '@/lib/actions/badges';
import { useToast } from '@/components/ui/toast-provider';
import type { GymCustomBadge, ExerciseMilestoneBadge, Exercise } from '@/types/api';

const ICON_OPTIONS = [
  'trophy', 'medal', 'flame', 'barbell', 'flash', 'rocket',
  'star', 'calendar', 'sunny', 'moon', 'grid', 'footsteps',
];

interface Props {
  gymId: string;
  customBadges: GymCustomBadge[];
  milestoneBadges: ExerciseMilestoneBadge[];
  exercises: Exercise[];
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-border"
      style={{ backgroundColor: color }}
    />
  );
}

export function BadgesClient({ gymId, customBadges, milestoneBadges, exercises }: Props) {
  return (
    <div className="space-y-10">
      <CustomBadgesSection gymId={gymId} badges={customBadges} />
      <MilestoneBadgesSection gymId={gymId} badges={milestoneBadges} exercises={exercises} />
    </div>
  );
}

function CustomBadgesSection({ gymId, badges }: { gymId: string; badges: GymCustomBadge[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [form, setForm] = useState({ name: '', description: '', icon: 'trophy', color: '#F59E0B' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createCustomBadge(gymId, {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon,
        color: form.color,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Custom badge created.');
        setOpen(false);
        setForm({ name: '', description: '', icon: 'trophy', color: '#F59E0B' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Custom Badges</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One-off badges you can award manually to members
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition"
        >
          + New Badge
        </button>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No custom badges yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {badges.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center gap-4">
                <ColorDot color={b.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  {b.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">{b.icon}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">New Custom Badge</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Name *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required maxLength={100}
                  placeholder="e.g. Mr Bench Press 100kg"
                  className={inputCls}
                />
              </Field>
              <Field label="Description">
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What did the member achieve?"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Icon">
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className={inputCls}
                  >
                    {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-9 rounded cursor-pointer border border-border bg-transparent"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{form.color}</span>
                  </div>
                </Field>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className={cancelBtn}>Cancel</button>
                <button type="submit" disabled={pending} className={submitBtn}>
                  {pending ? 'Creating…' : 'Create Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneBadgesSection({
  gymId, badges, exercises,
}: { gymId: string; badges: ExerciseMilestoneBadge[]; exercises: Exercise[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [form, setForm] = useState({
    exerciseId: exercises[0]?.id ?? '',
    badgeName: '',
    description: '',
    weightKg: '',
    icon: 'barbell',
    color: '#F59E0B',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weight = parseFloat(form.weightKg);
    if (isNaN(weight) || weight <= 0) {
      setError('Enter a valid weight in kg.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await createMilestoneBadge(gymId, {
        exerciseId: form.exerciseId,
        badgeName: form.badgeName,
        description: form.description || undefined,
        weightKg: weight,
        icon: form.icon,
        color: form.color,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Milestone badge created.');
        setOpen(false);
        setForm({ exerciseId: exercises[0]?.id ?? '', badgeName: '', description: '', weightKg: '', icon: 'barbell', color: '#F59E0B' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Exercise Milestone Badges</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-awarded when a PR submission is approved at or above the weight threshold
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={exercises.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-40"
        >
          + New Milestone
        </button>
      </div>

      {exercises.length === 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          Add exercises to the leaderboard first to create milestone badges.
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No milestone badges yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {badges.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center gap-4">
                <ColorDot color={b.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.badgeName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.exercise.name} · {b.weightKg} kg+
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{b.icon}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">New Milestone Badge</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Exercise *">
                <select
                  value={form.exerciseId}
                  onChange={(e) => setForm({ ...form, exerciseId: e.target.value })}
                  required className={inputCls}
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Badge Name *">
                <input
                  value={form.badgeName}
                  onChange={(e) => setForm({ ...form, badgeName: e.target.value })}
                  required maxLength={100}
                  placeholder="e.g. Bench Press 100kg Club"
                  className={inputCls}
                />
              </Field>
              <Field label="Description">
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What makes this milestone special?"
                  className={inputCls}
                />
              </Field>
              <Field label="Weight Threshold (kg) *">
                <input
                  type="number"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  required min={1} max={9999} step={0.5}
                  placeholder="100"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Icon">
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className={inputCls}
                  >
                    {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-9 rounded cursor-pointer border border-border bg-transparent"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{form.color}</span>
                  </div>
                </Field>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className={cancelBtn}>Cancel</button>
                <button type="submit" disabled={pending} className={submitBtn}>
                  {pending ? 'Creating…' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
const cancelBtn =
  'flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition';
const submitBtn =
  'flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition';
