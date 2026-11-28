'use client';

import { useState } from 'react';
import { Dialog, SelectField, TextField } from '@gym-saas/ui';
import { BadgeCategory, BadgeTier } from '@gym-saas/contracts';
import { createCustomBadge, saveLadder } from '@/lib/actions/badges';
import { useToast } from '@/components/ui/toast-provider';
import { BadgeMedal } from './badge-medal';
import { CATEGORY_HINT, CATEGORY_LABEL, CATEGORY_ORDER, LADDER_TIERS, TIER_LABEL } from './badge-labels';
import type { BadgeLadder, ExerciseMilestoneBadge, GymCustomBadge, LadderWeights } from '@/types/api';

const ICON_OPTIONS = [
  'trophy', 'medal', 'flame', 'barbell', 'flash', 'rocket',
  'star', 'calendar', 'sunny', 'moon', 'grid', 'footsteps',
  'heart', 'ribbon', 'diamond', 'shield-checkmark',
];

const LADDER_ICON = 'barbell';
const LADDER_COLOR = '#1F2937';

interface Props {
  gymId: string;
  customBadges: GymCustomBadge[] | null;
  ladders: BadgeLadder[] | null;
  olderMilestones: ExerciseMilestoneBadge[];
  /** Owners create custom badges; staff only manage the lift ladders here. */
  canCreateBadges: boolean;
}

export function BadgesClient({ gymId, customBadges, ladders, olderMilestones, canCreateBadges }: Props) {
  return (
    <div className="space-y-10">
      <LaddersSection gymId={gymId} ladders={ladders} />
      <CustomBadgesSection gymId={gymId} badges={customBadges} canCreate={canCreateBadges} />
      {olderMilestones.length > 0 && <OlderMilestonesSection badges={olderMilestones} />}
    </div>
  );
}

function CustomBadgesSection({
  gymId,
  badges,
  canCreate,
}: {
  gymId: string;
  badges: GymCustomBadge[] | null;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const emptyForm = { name: '', description: '', icon: 'trophy', color: '#F59E0B', category: BadgeCategory.LOYALTY };
  const [form, setForm] = useState(emptyForm);

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
        category: form.category,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Custom badge created.');
        setOpen(false);
        setForm(emptyForm);
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
        {canCreate && (
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            + New Badge
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {badges === null ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Could not load custom badges. Refresh to try again.</p>
        ) : badges.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No custom badges yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {badges.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center gap-4">
                <BadgeMedal category={b.category} tier={null} color={b.color} icon={b.icon} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  {b.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[b.category]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="New Custom Badge" dismissible={!pending}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            maxLength={100}
            placeholder="e.g. Mr Bench Press 100kg"
          />
          <TextField
            label="Description"
            hint="Optional"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What did the member achieve?"
          />
          <div className="space-y-1.5">
            <p id="badge-category-label" className="text-label text-foreground">Category</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="badge-category-label">
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c}
                  onClick={() => setForm({ ...form, category: c })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                    form.category === c
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BadgeMedal category={c} tier={null} color={form.color} icon={form.icon} size={32} />
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_HINT[form.category]}. Members equip one badge per category.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </SelectField>
            <div className="space-y-1.5">
              <label htmlFor="badge-color" className="block text-label text-foreground">Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="badge-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-9 rounded cursor-pointer border border-border bg-transparent"
                />
                <span className="text-sm text-muted-foreground font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-destructive-text">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={pending} className={submitBtn}>
              {pending ? 'Creating…' : 'Create Badge'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function LaddersSection({ gymId, ladders }: { gymId: string; ladders: BadgeLadder[] | null }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Lift Ladders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bronze, silver and gold Strength badges for each leaderboard lift, awarded when an approved PR
          reaches the weight. Members who already lifted it get the badge when you save.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {ladders === null ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Could not load the lift ladders.</p>
        ) : ladders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Add lifts to the leaderboard to give them a ladder.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ladders.map((l) => (
              <LadderRow key={l.exercise.id} gymId={gymId} ladder={l} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const MAX_LADDER_KG = 1000;

function ladderError(values: Record<BadgeTier, string>, parsed: LadderWeights): string | null {
  if (LADDER_TIERS.some((t) => values[t].trim() === '')) return 'Enter a weight for each tier.';
  if (LADDER_TIERS.some((t) => !Number.isFinite(parsed[t]) || parsed[t] <= 0 || parsed[t] > MAX_LADDER_KG)) {
    return `Weights must be between 1 and ${MAX_LADDER_KG} kg.`;
  }
  if (LADDER_TIERS.some((t) => Math.round(parsed[t] * 100) !== parsed[t] * 100)) return 'Use at most two decimal places.';
  if (!(parsed.BRONZE < parsed.SILVER && parsed.SILVER < parsed.GOLD)) return 'Weights must go up from bronze to silver to gold.';
  return null;
}

function toInputs(w: LadderWeights): Record<BadgeTier, string> {
  return { BRONZE: String(w.BRONZE), SILVER: String(w.SILVER), GOLD: String(w.GOLD) };
}

function LadderRow({ gymId, ladder }: { gymId: string; ladder: BadgeLadder }) {
  const saved = ladder.weights ?? ladder.suggested;
  const [values, setValues] = useState(toInputs(saved));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const parsed = {
    BRONZE: Number(values.BRONZE),
    SILVER: Number(values.SILVER),
    GOLD: Number(values.GOLD),
  };
  const validationError = ladderError(values, parsed);
  const valid = validationError === null;
  const dirty = !ladder.enabled || LADDER_TIERS.some((t) => parsed[t] !== saved[t]);

  async function save(enabled: boolean) {
    setError(null);
    setPending(true);
    try {
      const result = await saveLadder(gymId, ladder.exercise.id, enabled ? { enabled, weights: parsed } : { enabled });
      if (result.error) setError(result.error);
      else toast.success(enabled ? `${ladder.exercise.name} ladder saved.` : `${ladder.exercise.name} ladder switched off.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{ladder.exercise.name}</p>
          {!ladder.enabled && <p className="text-xs text-muted-foreground mt-0.5">Off · members can&apos;t earn these</p>}
        </div>
        {ladder.enabled && (
          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Switch off
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {LADDER_TIERS.map((t) => (
          <label key={t} className="flex items-center gap-2">
            <BadgeMedal category={BadgeCategory.STRENGTH} tier={t} color={LADDER_COLOR} icon={LADDER_ICON} size={32} />
            <span className="space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {TIER_LABEL[t]} (kg)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={1000}
                step={0.5}
                value={values[t]}
                onChange={(e) => {
                  setError(null);
                  setValues({ ...values, [t]: e.target.value });
                }}
                aria-label={`${ladder.exercise.name} ${TIER_LABEL[t]} weight in kg`}
                className={`${inputCls} w-24`}
              />
            </span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending || !valid || !dirty}
          className="ml-auto px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {pending ? 'Saving…' : ladder.enabled ? 'Save' : 'Switch on'}
        </button>
      </div>
      {validationError && <p className="text-xs text-destructive-text">{validationError}</p>}
      {error && <p role="alert" className="text-xs text-destructive-text">{error}</p>}
    </li>
  );
}

function OlderMilestonesSection({ badges }: { badges: ExerciseMilestoneBadge[] }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Older Milestone Badges</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Single-weight milestones from before lift ladders. They still award; new ones use ladders.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <ul className="divide-y divide-border">
          {badges.map((b) => (
            <li key={b.id} className="px-5 py-3 flex items-center gap-4">
              <BadgeMedal category={BadgeCategory.STRENGTH} tier={null} color={b.color} icon={b.icon} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{b.badgeName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {b.exercise.name} · {Number(b.weightKg)} kg+
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring';
const cancelBtn =
  'flex-1 py-2 rounded-md bg-surface border border-border text-sm font-semibold text-foreground hover:bg-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
const submitBtn =
  'flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover disabled:bg-disabled disabled:text-disabled-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
