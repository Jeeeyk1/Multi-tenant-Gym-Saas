'use client';

import { useActionState, useState } from 'react';
import { PRIVACY_URL, TERMS_URL } from '@/lib/brand';
import { activateMember, type ActivateMemberState } from './actions';

interface Props {
  token: string;
  gymCode: string;
}

const initial: ActivateMemberState = { error: null, success: false };

export function MemberActivateForm({ token, gymCode }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const action = activateMember.bind(null, token, gymCode);
  const [state, formAction, pending] = useActionState(action, initial);

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

  if (state.success) {
    return (
      <div className="text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-bg border border-success/30 mx-auto">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <path d="m9 12 2 2 4-4" />
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">You&apos;re all set!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your membership is now active. Download the FitOps app to sign in.
          </p>
        </div>

        {gymCode && (
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your gym code</p>
            <p className="text-2xl font-mono font-bold text-foreground tracking-widest">{gymCode.toUpperCase()}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Open the app, enter your gym code, then sign in with your email and new password.
        </p>
      </div>
    );
  }

  const error = clientError ?? state.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="password" value={password} readOnly />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setClientError(null); }}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          className="w-full bg-surface py-2.5 text-sm border border-border rounded-md px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setClientError(null); }}
          placeholder="Repeat password"
          required
          className="w-full bg-surface py-2.5 text-sm border border-border rounded-md px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-focus-ring focus:border-focus-ring transition"
          disabled={pending}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:bg-primary-hover transition disabled:bg-disabled disabled:text-disabled-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {pending ? 'Activating…' : 'Activate Membership'}
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
