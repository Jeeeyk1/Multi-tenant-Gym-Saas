import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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
  REJECTED: 'bg-destructive/10 text-destructive',
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

  const [invoices, total] = await api
    .get<[Invoice[], number]>(`/v1/admin/invoices?page=${page}&limit=${limit}`)
    .catch(() => [[], 0] as [Invoice[], number]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Invoices</h1>
        <p className="text-sm text-muted-foreground">{total} total</p>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">No invoices yet.</p>
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

      {pages > 1 && (
        <div className="flex items-center gap-2 mt-4 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/dashboard/invoices?page=${p}`}
              className={`px-3 py-1.5 rounded-lg border transition ${
                p === page ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-foreground/5'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
