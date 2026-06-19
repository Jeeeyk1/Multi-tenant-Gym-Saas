'use client';

import { useState } from 'react';
import { updateGymSchedules } from '@/lib/actions/settings';
import type { GymSchedule } from '@/types/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultSchedules(): GymSchedule[] {
  return DAY_NAMES.map((_, i) => ({
    dayOfWeek: i,
    openTime: '06:00',
    closeTime: '22:00',
    isClosed: i === 0, // Sunday closed by default
  }));
}

function mergeWithDefaults(incoming: GymSchedule[]): GymSchedule[] {
  return defaultSchedules().map((def) => {
    const found = incoming.find((s) => s.dayOfWeek === def.dayOfWeek);
    return found ?? def;
  });
}

interface Props {
  gymId: string;
  schedules: GymSchedule[];
}

export function SchedulesForm({ gymId, schedules: initial }: Props) {
  const [rows, setRows] = useState<GymSchedule[]>(() => mergeWithDefaults(initial));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (dayOfWeek: number, patch: Partial<GymSchedule>) => {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateGymSchedules(gymId, rows);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message ?? 'Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Opening Hours</h2>
        <p className="text-xs text-muted-foreground mt-1">Set your gym's operating hours for each day of the week.</p>
      </div>

      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.dayOfWeek} className="flex items-center gap-4 py-3">
            {/* Day name */}
            <span className="w-24 text-sm font-medium text-foreground flex-shrink-0">
              {DAY_NAMES[row.dayOfWeek]}
            </span>

            {/* Open / Closed toggle */}
            <button
              type="button"
              onClick={() => update(row.dayOfWeek, { isClosed: !row.isClosed })}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                !row.isClosed ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  !row.isClosed ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>

            <span className={`text-xs font-medium w-10 flex-shrink-0 ${row.isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
              {row.isClosed ? 'Closed' : 'Open'}
            </span>

            {/* Time inputs */}
            {!row.isClosed && (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={row.openTime ?? '06:00'}
                  onChange={(e) => update(row.dayOfWeek, { openTime: e.target.value })}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <input
                  type="time"
                  value={row.closeTime ?? '22:00'}
                  onChange={(e) => update(row.dayOfWeek, { closeTime: e.target.value })}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {row.isClosed && <div className="flex-1" />}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-black text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Hours'}
        </button>
        {success && <span className="text-sm text-emerald-400 font-medium">✓ Saved</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </section>
  );
}
