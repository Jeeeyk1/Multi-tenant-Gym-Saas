'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { awardBadge } from '@/lib/actions/badges';
import { useToast } from '@/components/ui/toast-provider';
import type { GymCustomBadge } from '@/types/api';

interface Props {
  gymId: string;
  memberId: string;
  customBadges: GymCustomBadge[];
}

export function AwardBadgeDialog({ gymId, memberId, customBadges }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setPending(true);
    try {
      const result = await awardBadge(gymId, memberId, {
        customBadgeId: selectedId,
        proofNotes: proofNotes.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Badge awarded!');
        setOpen(false);
        setSelectedId('');
        setProofNotes('');
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (customBadges.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No custom badges yet.{' '}
        <a href="/dashboard/badges" className="text-primary hover:underline">
          Create one →
        </a>
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary hover:underline"
      >
        + Award Badge
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Award Badge</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Badge
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  required
                  className="w-full bg-surface py-2 text-sm border border-border rounded-md px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring"
                >
                  <option value="">Select a badge…</option>
                  {customBadges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Proof / Notes <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe what the member achieved…"
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring resize-none focus:border-focus-ring"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="bg-surface flex-1 py-2 text-sm rounded-md border border-border text-foreground hover:text-foreground transition font-semibold hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !selectedId}
                  className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground font-semibold transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {pending ? 'Awarding…' : 'Award'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
