'use client';

import { useConfirm, useToast } from '@gym-saas/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GymStatus } from '@gym-saas/contracts';
import { clientApi } from '@/lib/client-api';

export function GymStatusToggle({ gymId, currentStatus }: { gymId: string; currentStatus: GymStatus }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const isActive = currentStatus === GymStatus.ACTIVE;
  const next = isActive ? GymStatus.SUSPENDED : GymStatus.ACTIVE;

  async function toggle() {
    const ok = await confirm(
      isActive
        ? {
            title: 'Suspend this gym?',
            message: 'Its staff and members lose access to FitOps until you activate it again.',
            confirmLabel: 'Suspend gym',
            variant: 'destructive',
          }
        : { title: 'Activate this gym?', message: 'Its staff and members get access again.', confirmLabel: 'Activate gym' },
    );
    if (!ok) return;
    setPending(true);
    try {
      await clientApi.patch(`/api/admin/gyms/${gymId}/status`, { status: next });
      toast.success(isActive ? 'Gym suspended' : 'Gym activated');
      router.refresh();
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Failed to update the gym');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 ${
        isActive
          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          : 'bg-success/10 text-success hover:bg-success/20'
      }`}
    >
      {pending ? '…' : isActive ? 'Suspend Gym' : 'Activate Gym'}
    </button>
  );
}
