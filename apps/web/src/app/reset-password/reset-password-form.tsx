'use client';

import { useActionState, useState } from 'react';
import { resetPassword } from './actions';

interface Props {
  token: string;
}

const initial = { error: null as string | null };

export function ResetPasswordForm({ token }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const resetWithToken = resetPassword.bind(null, token);
  const [state, action, pending] = useActionState(resetWithToken, initial);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (password !== confirm) {
      e.preventDefault();
      setClientError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      e.preventDefault();
      setClientError('Password must be at least 8 characters');
      return;
    }
    setClientError(null);
  }

  const error = clientError ?? state.error;

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="password" value={password} readOnly />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setClientError(null); }}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          disabled={pending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Confirm password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setClientError(null); }}
          placeholder="Repeat password"
          required
          disabled={pending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  );
}
