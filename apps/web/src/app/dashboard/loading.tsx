import { Skeleton } from '@gym-saas/ui';

/** Shown while a dashboard page's server data loads (shared by all dashboard routes). */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-4 sm:p-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
