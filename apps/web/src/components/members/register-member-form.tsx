'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerMember } from '@/lib/actions/members';
import type { MembershipPlan } from '@/types/api';

interface Props {
  gymId: string;
  plans: MembershipPlan[];
}

export function RegisterMemberForm({ gymId, plans }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const activePlans = plans.filter((p) => p.isActive);
  const hasPlanSelected = !!selectedPlanId;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await registerMember(gymId, {}, fd);
      if (result?.error) setError(result.error);
    } catch {
      // redirect() throws — that means success, let Next.js handle navigation
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Full name */}
      <div>
        <label htmlFor="fullName" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Full Name <span className="text-destructive">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          required
          disabled={isPending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          required
          disabled={isPending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Phone <span className="text-muted-foreground font-normal normal-case">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+63 912 345 6789"
          disabled={isPending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {/* Plan */}
      <div>
        <label htmlFor="planId" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Membership Plan
        </label>
        {activePlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active plans. You must set an expiry date manually.</p>
        ) : (
          <select
            id="planId"
            name="planId"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            disabled={isPending}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          >
            <option value="">— No plan (set expiry manually) —</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.durationDays}d · ₱{p.price.toLocaleString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Expiry date — shown only when no plan selected */}
      {!hasPlanSelected && (
        <div>
          <label htmlFor="expiryDate" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Expiry Date <span className="text-destructive">*</span>
          </label>
          <input
            id="expiryDate"
            name="expiryDate"
            type="date"
            required={!hasPlanSelected}
            disabled={isPending}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-950/60 border border-destructive rounded-lg px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {isPending ? 'Registering…' : 'Register Member'}
        </button>
      </div>
    </form>
  );
}
