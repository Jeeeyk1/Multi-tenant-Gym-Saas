'use client';

import { useState } from 'react';
import { resolveCode } from '@/lib/auth';

export function CodeEntryForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await resolveCode({ error: null }, fd);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. DEVGYM"
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-base font-semibold tracking-widest uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Checking…' : 'Continue →'}
      </button>
    </form>
  );
}
