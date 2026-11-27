'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@gym-saas/ui';

/** Re-runs the page's server fetches after a failed load. */
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" size="sm" status={pending ? 'loading' : 'idle'} onClick={() => startTransition(() => router.refresh())}>
      Try again
    </Button>
  );
}
