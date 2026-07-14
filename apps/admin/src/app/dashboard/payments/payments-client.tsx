'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { formatDate } from '@/lib/utils';
import type { PendingPayment } from './page';

function formatPhp(amount: number): string {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentsClient({ initialPayments }: { initialPayments: PendingPayment[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(id: string) {
    if (!confirm('Confirm you have checked this payment reference and it is valid?')) return;
    setPendingId(id);
    setError(null);
    try {
      await clientApi.post(`/api/admin/invoices/${id}/verify`);
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to verify payment');
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejecting this payment reference:');
    if (!reason) return;
    setPendingId(id);
    setError(null);
    try {
      await clientApi.post(`/api/admin/invoices/${id}/reject`, { reason });
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to reject payment');
    } finally {
      setPendingId(null);
    }
  }

  if (initialPayments.length === 0) {
    return <p className="text-muted-foreground text-sm">No payments awaiting verification.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {initialPayments.map((payment) => (
        <div
          key={payment.id}
          className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{payment.organization.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{payment.invoiceNumber}</p>
            <p className="text-sm text-foreground mt-2">
              {formatPhp(payment.amount)} <span className="text-muted-foreground">{payment.currency}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ref: <span className="text-foreground font-mono">{payment.paymentReference ?? '—'}</span>
              {payment.paymentMethod && ` · ${payment.paymentMethod}`}
            </p>
            {payment.paymentSubmittedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {formatDate(payment.paymentSubmittedAt)}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => reject(payment.id)}
              disabled={pendingId === payment.id}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => verify(payment.id)}
              disabled={pendingId === payment.id}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition disabled:opacity-50"
            >
              {pendingId === payment.id ? '…' : 'Verify'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
