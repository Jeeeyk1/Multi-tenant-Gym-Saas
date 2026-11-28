'use client';

import { useActionState } from 'react';
import { submitPayment } from '@/lib/actions/billing';

export function PaymentForm({ gymId, invoiceId }: { gymId: string; invoiceId: string }) {
  const [state, action, pending] = useActionState(submitPayment.bind(null, gymId, invoiceId), {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="reference" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Payment reference
        </label>
        <input
          id="reference"
          name="reference"
          type="text"
          maxLength={100}
          placeholder="e.g. GCash reference number"
          required
          disabled={pending}
          className="w-full bg-surface py-2.5 text-sm border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
        />
      </div>

      <div>
        <label htmlFor="method" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Payment method (optional)
        </label>
        <input
          id="method"
          name="method"
          type="text"
          maxLength={40}
          placeholder="GCash, bank transfer, etc."
          disabled={pending}
          className="w-full bg-surface py-2.5 text-sm border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
        />
      </div>

      {state.error && <p className="text-sm text-destructive-text">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 text-sm rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {pending ? 'Submitting…' : "I've paid — submit reference"}
      </button>
    </form>
  );
}
