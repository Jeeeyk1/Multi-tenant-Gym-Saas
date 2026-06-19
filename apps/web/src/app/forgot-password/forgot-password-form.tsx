'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

const initial: ForgotPasswordState = { error: null, submitted: false };

export function ForgotPasswordForm({ backCode }: { backCode?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">
          If an account with that email exists, a reset link has been sent. Check your inbox.
        </p>
        <Link
          href={backCode ? `/${backCode}/login` : '/'}
          className="block text-sm text-primary hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          required
          disabled={pending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send Reset Link'}
      </button>

      <Link
        href={backCode ? `/${backCode}/login` : '/'}
        className="block text-center text-xs text-muted-foreground hover:text-foreground transition"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
