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
          className="w-full bg-surface py-2.5 text-base border border-border rounded-md px-3 text-foreground font-semibold tracking-widest uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {isPending ? 'Checking…' : 'Continue →'}
      </button>
    </form>
  );
}
