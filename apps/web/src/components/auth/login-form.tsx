'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/auth';

interface Props {
  code: string;
  type: 'gym' | 'org';
}

export function LoginForm({ code, type }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await login(code, type, { error: null }, fd);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          className="w-full bg-surface py-2.5 border border-border rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-surface py-2.5 border border-border rounded-md px-3 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium hover:opacity-75 transition"
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive-bg border border-destructive rounded-md px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:cursor-not-allowed mt-2 disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {isPending ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          First time? Check your email for an activation link.
        </p>
        <Link
          href={`/forgot-password?code=${code}`}
          className="text-xs text-primary hover:underline shrink-0 ml-2"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
