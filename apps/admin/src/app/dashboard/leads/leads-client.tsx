'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { formatDate } from '@/lib/utils';
import type { SignupRequest } from './page';

const STATUS_STYLE: Record<SignupRequest['status'], string> = {
  NEW: 'bg-primary/10 text-primary',
  CONTACTED: 'bg-warning/10 text-warning',
  CONVERTED: 'bg-success/10 text-success',
  REJECTED: 'bg-destructive/10 text-destructive',
};

export function LeadsClient({ initialLeads }: { initialLeads: SignupRequest[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markContacted(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await clientApi.patch(`/api/admin/signup-requests/${id}/status`, { status: 'CONTACTED' });
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to update status');
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejecting this lead (optional):') ?? undefined;
    setPendingId(id);
    setError(null);
    try {
      await clientApi.patch(`/api/admin/signup-requests/${id}/status`, { status: 'REJECTED', notes: reason });
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to reject lead');
    } finally {
      setPendingId(null);
    }
  }

  if (initialLeads.length === 0) {
    return <p className="text-muted-foreground text-sm">No signup requests yet.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {initialLeads.map((lead) => (
        <div
          key={lead.id}
          className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{lead.gymName}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[lead.status]}`}>
                {lead.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{lead.ownerName} · {lead.email}{lead.phone && ` · ${lead.phone}`}</p>
            {lead.planInterest && (
              <p className="text-xs text-muted-foreground mt-1">Interested in: {lead.planInterest}</p>
            )}
            {lead.notes && <p className="text-xs text-muted-foreground mt-1">Notes: {lead.notes}</p>}
            <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(lead.createdAt)}</p>
          </div>
          {(lead.status === 'NEW' || lead.status === 'CONTACTED') && (
            <div className="flex gap-2 flex-shrink-0">
              {lead.status === 'NEW' && (
                <button
                  onClick={() => markContacted(lead.id)}
                  disabled={pendingId === lead.id}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-foreground/5 transition disabled:opacity-50"
                >
                  Mark contacted
                </button>
              )}
              <button
                onClick={() => reject(lead.id)}
                disabled={pendingId === lead.id}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
              >
                Reject
              </button>
              <Link
                href={`/dashboard/gyms/new?leadId=${lead.id}`}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
              >
                Convert
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
