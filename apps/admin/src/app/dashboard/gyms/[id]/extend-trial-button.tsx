'use client';

import { useConfirm } from '@gym-saas/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';

interface ExtendTrialResult {
  trialEndsAt: string;
}

export function ExtendTrialButton({ gymId, lapsed }: { gymId: string; lapsed: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [days, setDays] = useState(7);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtend() {
    const confirmMsg = lapsed
      ? `Reopen the trial and unlock this gym for ${days} more days? Any unpaid invoice will be voided.`
      : `Add ${days} more trial days to this gym?`;
    const ok = await confirm({ title: lapsed ? 'Reopen the trial?' : 'Extend the trial?', message: confirmMsg, confirmLabel: lapsed ? 'Reopen trial' : 'Extend trial' });
    if (!ok) return;

    setPending(true);
    setError(null);
    try {
      await clientApi.post<ExtendTrialResult>(`/api/admin/gyms/${gymId}/extend-trial`, { days });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extend trial';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={365}
        value={days}
        onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
        disabled={pending}
        className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
      />
      <button
        onClick={handleExtend}
        disabled={pending}
        className="text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50 bg-primary/10 text-primary hover:bg-primary/20"
      >
        {pending ? '…' : lapsed ? 'Extend & Reopen Trial' : 'Extend Trial'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
