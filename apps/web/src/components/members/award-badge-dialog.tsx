'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, SelectField, TextAreaField } from '@gym-saas/ui';
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

      <Dialog open={open} onClose={() => setOpen(false)} title="Award Badge" size="sm" dismissible={!pending}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Badge" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">Select a badge…</option>
            {customBadges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>

          <TextAreaField
            label="Proof / notes"
            hint="Optional"
            value={proofNotes}
            onChange={(e) => setProofNotes(e.target.value)}
            rows={3}
            placeholder="Describe what the member achieved…"
          />

          {error && <p role="alert" className="text-xs text-destructive-text">{error}</p>}

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
      </Dialog>
    </>
  );
}
