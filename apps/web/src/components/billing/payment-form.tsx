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
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm"
      >
        {pending ? 'Submitting…' : "I've paid — submit reference"}
      </button>
    </form>
  );
}
