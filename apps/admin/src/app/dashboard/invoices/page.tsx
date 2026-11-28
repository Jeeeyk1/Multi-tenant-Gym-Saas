import Link from 'next/link';
import { cloudOfflineOutline, receiptOutline } from 'ionicons/icons';
import { EmptyState, PageHeader, Pagination } from '@gym-saas/ui';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Invoices' };

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'OPEN' | 'AWAITING_VERIFICATION' | 'PAID' | 'REJECTED' | 'VOID';
  amount: number;
  currency: string;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  organization: { id: string; name: string };
}

const STATUS_STYLE: Record<Invoice['status'], string> = {
  OPEN: 'bg-primary/10 text-primary',
  AWAITING_VERIFICATION: 'bg-warning/10 text-warning',
  PAID: 'bg-success/10 text-success',
  REJECTED: 'bg-destructive/10 text-destructive-text',
  VOID: 'bg-foreground/5 text-muted-foreground',
};

function formatPhp(amount: number): string {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? '1');
  const limit = 50;

  // null means the request failed; before, a failure looked like "No invoices yet".
  const result = await api.get<[Invoice[], number]>(`/v1/admin/invoices?page=${page}&limit=${limit}`).catch(() => null);
  const [invoices, total] = result ?? [[], 0];
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-4 sm:p-8">
      <PageHeader eyebrow="FitOps" title="Invoices" description={result ? `${total.toLocaleString('en-US')} total` : undefined} className="mb-6" />

      {!result ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState icon={cloudOfflineOutline} tone="error" title="Couldn't load invoices" message="Check that the API is running, then reload the page." />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState icon={receiptOutline} title="No invoices yet" message="Invoices appear here when gyms are billed." />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3">Paid</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-foreground/5 transition">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-foreground">{inv.organization.name}</td>
                  <td className="px-4 py-3 text-foreground">{formatPhp(inv.amount)} <span className="text-muted-foreground text-xs">{inv.currency}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.dueAt ? formatDate(inv.dueAt) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.paidAt ? formatDate(inv.paidAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && total > 0 ? (
        <Pagination
          className="mt-4"
          page={page}
          pages={pages}
          total={total}
          pageSize={limit}
          hrefFor={(p) => (p > 1 ? `/dashboard/invoices?page=${p}` : '/dashboard/invoices')}
          linkAs={Link}
          noun="invoices"
        />
      ) : null}
    </div>
  );
}
