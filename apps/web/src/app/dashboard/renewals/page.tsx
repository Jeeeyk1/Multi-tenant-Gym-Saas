import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import type { GymRenewal } from '@/types/api';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Card',
};

export default async function RenewalsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const renewals = await api
    .get<GymRenewal[]>(`/gyms/${user.gymId}/renewals?limit=100`)
    .catch(() => [] as GymRenewal[]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Renewals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent membership renewals · {renewals.length} shown
        </p>
      </div>

      {renewals.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No renewals recorded yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Expiry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Renewed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {renewals.map((r) => (
                <tr key={r.id} className="hover:bg-white/3 transition">
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/members/${r.member.id}`} className="hover:text-primary transition">
                      <p className="font-medium text-foreground">{r.member.user.fullName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.member.membershipNumber}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">
                    {r.member.membershipPlan?.name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {fmtMoney(r.amountPaid)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {r.paymentMethod ? (METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{fmt(r.newExpiry)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{fmt(r.renewedAt)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.renewedByUser.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
