'use client';

import { useState } from 'react';
import Image from 'next/image';
import { approveSubmission, rejectSubmission } from '@/lib/actions/leaderboard';
import type { PrSubmission } from '@/types/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function SubmissionCard({
  submission,
  gymId,
  onResolved,
}: {
  submission: PrSubmission;
  gymId: string;
  onResolved: (id: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setBusy(true);
    setError(null);
    const res = await approveSubmission(gymId, submission.id);
    if (res.error) { setError(res.error); setBusy(false); }
    else onResolved(submission.id);
  }

  async function handleReject() {
    if (!reason.trim()) { setError('Please provide a rejection reason.'); return; }
    setBusy(true);
    setError(null);
    const res = await rejectSubmission(gymId, submission.id, reason.trim());
    if (res.error) { setError(res.error); setBusy(false); }
    else onResolved(submission.id);
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex gap-0">
        {/* Photo */}
        <div className="relative w-48 shrink-0 bg-background">
          <Image
            src={submission.photoUrl}
            alt="PR photo"
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Details */}
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-base">
                {submission.member.user.fullName}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {submission.member.membershipNumber}
              </p>
            </div>
            <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">
              PENDING
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exercise</span>
              <span className="font-medium text-foreground">{submission.exercise.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="text-foreground">{submission.exercise.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium text-foreground">{Number(submission.weightKg)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reps</span>
              <span className="font-medium text-foreground">{submission.reps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. 1RM</span>
              <span className="font-bold text-primary">{Number(submission.estimated1rm).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span className="text-foreground">{fmtDate(submission.submittedAt)}</span>
            </div>
          </div>

          {submission.notes && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
              {submission.notes}
            </p>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {rejecting ? (
            <div className="space-y-2">
              <textarea
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/40"
                rows={2}
                placeholder="Reason for rejection…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  disabled={busy}
                  className="px-4 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg hover:bg-destructive/20 transition disabled:opacity-50"
                >
                  {busy ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => { setRejecting(false); setError(null); }}
                  className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={busy}
                className="px-5 py-2 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {busy ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                className="px-5 py-2 bg-background border border-border text-sm text-muted-foreground rounded-lg hover:text-foreground hover:border-destructive/40 transition disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PendingClient({
  submissions,
  gymId,
}: {
  submissions: PrSubmission[];
  gymId: string;
}) {
  const [list, setList] = useState(submissions);

  function handleResolved(id: string) {
    setList((prev) => prev.filter((s) => s.id !== id));
  }

  if (list.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">All submissions have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((s) => (
        <SubmissionCard
          key={s.id}
          submission={s}
          gymId={gymId}
          onResolved={handleResolved}
        />
      ))}
    </div>
  );
}
