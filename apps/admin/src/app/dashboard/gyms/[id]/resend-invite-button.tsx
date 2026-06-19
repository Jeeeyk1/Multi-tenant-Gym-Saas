'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/client-api';

interface ResendInviteResult {
  inviteToken: string;
}

export function ResendInviteButton({ gymId }: { gymId: string }) {
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleResend() {
    if (!confirm('Regenerate the activation link for this gym owner? The previous link will be invalidated.')) return;
    setPending(true);
    setError(null);
    setToken(null);
    try {
      const result = await clientApi.post<ResendInviteResult>(`/api/admin/gyms/${gymId}/resend-invite`);
      setToken(result.inviteToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invite';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleResend}
        disabled={pending}
        className="text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 bg-primary/10 text-primary hover:bg-primary/20"
      >
        {pending ? '…' : 'Resend Invite Link'}
      </button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {token && (
        <div className="mt-3 p-4 bg-surface border border-border rounded-xl space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            New activation token
          </p>
          <p className="text-xs text-muted-foreground">
            Copy and send this token to the gym owner. The previous link is now invalid.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 text-foreground break-all">
              {token}
            </code>
            <button
              onClick={copyToken}
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
