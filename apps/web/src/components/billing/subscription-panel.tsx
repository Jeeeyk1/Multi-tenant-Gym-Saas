import { getMySubscription } from '@/lib/actions/billing';
import { formatDate } from '@/lib/utils';
import { PaymentForm } from './payment-form';

function formatPhp(amount: number): string {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function SubscriptionPanel({ gymId }: { gymId: string }) {
  let data;
  try {
    data = await getMySubscription(gymId);
  } catch (err) {
    const e = err as { message?: string };
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">{e.message ?? 'Could not load subscription.'}</p>
      </div>
    );
  }

  const { subscription, invoice, paymentInstructions } = data;
  const needsAction = invoice && invoice.status === 'OPEN';
  const awaitingVerification = invoice && invoice.status === 'AWAITING_VERIFICATION';

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Billing</h1>
        <p className="text-sm text-muted-foreground">
          {subscription.plan.name} plan · billed {subscription.billingCycle === 'YEARLY' ? 'yearly' : 'monthly'}
        </p>
      </div>

      {subscription.status === 'PENDING_PAYMENT' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-sm text-destructive font-medium">
            Your gym is locked until the first payment is verified.
          </p>
        </div>
      )}
      {subscription.status === 'SUSPENDED' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-sm text-destructive font-medium">
            Your subscription was suspended for non-payment. Submit a payment reference below to reactivate.
          </p>
        </div>
      )}
      {subscription.status === 'PAST_DUE' && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <p className="text-sm text-foreground">
            Your renewal payment is past due. Please pay soon to avoid suspension.
          </p>
        </div>
      )}

      {invoice && (needsAction || awaitingVerification) && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Invoice {invoice.invoiceNumber}</p>
              {invoice.dueAt && (
                <p className="text-xs text-muted-foreground mt-0.5">Due {formatDate(invoice.dueAt)}</p>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{formatPhp(invoice.amount)}</p>
          </div>

          {invoice.rejectionReason && (
            <p className="text-sm text-destructive">
              Previous submission rejected: {invoice.rejectionReason}
            </p>
          )}

          {awaitingVerification ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm text-foreground">
                Reference <span className="font-mono">{invoice.paymentReference}</span> submitted —
                awaiting admin verification.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-background border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Payment instructions
                </p>
                {paymentInstructions.gcash && (
                  <p className="text-sm text-foreground">GCash: {paymentInstructions.gcash}</p>
                )}
                {paymentInstructions.bank && (
                  <p className="text-sm text-foreground">Bank: {paymentInstructions.bank}</p>
                )}
                <p className="text-xs text-muted-foreground pt-1">{paymentInstructions.note}</p>
              </div>
              <PaymentForm gymId={gymId} invoiceId={invoice.id} />
            </>
          )}
        </div>
      )}

      {!invoice && subscription.status === 'ACTIVE' && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-6">
          <p className="text-sm text-foreground">
            You&apos;re all set — subscription is active. Next renewal: {formatDate(subscription.currentPeriodEnd)}.
          </p>
        </div>
      )}
    </div>
  );
}
