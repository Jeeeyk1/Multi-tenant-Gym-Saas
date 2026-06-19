'use client';

import { useActionState } from 'react';
import { adminLogin } from '@/lib/auth';

const initial = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Email
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@example.com"
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          disabled={pending}
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
        {pending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
