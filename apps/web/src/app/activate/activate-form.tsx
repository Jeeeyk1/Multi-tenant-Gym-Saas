'use client';

import { useActionState, useState } from 'react';
import { TextField } from '@gym-saas/ui';
import { PRIVACY_URL, TERMS_URL } from '@/lib/brand';
import { activateAccount } from './actions';

interface Props {
  token: string;
}

const initial = { error: null as string | null };

export function ActivateForm({ token }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const activateWithToken = activateAccount.bind(null, token);
  const [state, action, pending] = useActionState(activateWithToken, initial);

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

      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setClientError(null); }}
        placeholder="Min. 8 characters"
        required
        minLength={8}
        disabled={pending}
      />

      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); setClientError(null); }}
        placeholder="Repeat password"
        required
        disabled={pending}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive-text">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {pending ? 'Activating…' : 'Activate Account'}
      </button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        By activating, you agree to our{' '}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Terms
        </a>{' '}
        and{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
