'use client';

import { alertCircleOutline } from 'ionicons/icons';
import { Button, EmptyState } from '@gym-saas/ui';

/** Any dashboard page that throws while rendering lands here instead of a blank screen. */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 sm:p-8">
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={alertCircleOutline}
          tone="error"
          title="This page couldn't load"
          message="Check your connection and try again. If it keeps happening, contact FitOps support."
          action={
            <Button variant="secondary" size="sm" onClick={reset}>
              Try again
            </Button>
          }
        />
      </div>
    </div>
  );
}
