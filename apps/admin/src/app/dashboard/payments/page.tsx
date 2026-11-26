import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { PaymentsClient } from './payments-client';

export const metadata: Metadata = { title: 'Payments' };

export interface PendingPayment {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentReference: string | null;
  paymentMethod: string | null;
  paymentSubmittedAt: string | null;
  organization: { id: string; name: string };
}

export default async function PaymentsPage() {
  const payments = await api.get<PendingPayment[]>('/v1/admin/payments/pending').catch(() => [] as PendingPayment[]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[13px] text-muted-foreground">FitOps</p>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pending Payments</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} awaiting verification
        </p>
      </div>

      <PaymentsClient initialPayments={payments} />
    </div>
  );
}
