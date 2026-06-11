'use client';

import { useState } from 'react';
import { updateLeaderboardConfig } from '@/lib/actions/leaderboard';
import type { Exercise, LeaderboardConfigItem } from '@/types/api';

const CATEGORY_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
  SHOULDERS: 'Shoulders',
  ARMS: 'Arms',
};

interface ExerciseState {
  exerciseId: string;
  name: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
  isGlobal: boolean;
}

function buildState(
  allExercises: Exercise[],
  config: LeaderboardConfigItem[],
): ExerciseState[] {
  const configMap = new Map(config.map((c) => [c.exercise.id, c]));
  return allExercises.map((ex, idx) => {
    const cfg = configMap.get(ex.id);
    return {
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      isActive: cfg?.isActive ?? false,
      displayOrder: cfg?.displayOrder ?? idx,
      isGlobal: ex.gymId === null,
    };
  });
}

export function LeaderboardConfigClient({
  allExercises,
  config,
  gymId,
}: {
  allExercises: Exercise[];
  config: LeaderboardConfigItem[];
  gymId: string;
}) {
  const [exercises, setExercises] = useState<ExerciseState[]>(
    () => buildState(allExercises, config),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(exerciseId: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId ? { ...e, isActive: !e.isActive } : e,
      ),
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = exercises
      .filter((e) => e.isActive)
      .map((e, idx) => ({
        exerciseId: e.exerciseId,
        isActive: true,
        displayOrder: idx,
      }));

    const res = await updateLeaderboardConfig(gymId, payload);
    setSaving(false);
    if (res.error) setError(res.error);
    else setSaved(true);
  }

  const byCategory = exercises.reduce<Record<string, ExerciseState[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  const activeCount = exercises.filter((e) => e.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeCount} exercise{activeCount !== 1 ? 's' : ''} enabled
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-400">✓ Saved</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-background/40">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category] ?? category}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {items.map((ex) => (
              <div
                key={ex.exerciseId}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground font-medium">{ex.name}</span>
                  {!ex.isGlobal && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Custom
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggle(ex.exerciseId)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    ex.isActive ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-label={ex.isActive ? 'Disable' : 'Enable'}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      ex.isActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
