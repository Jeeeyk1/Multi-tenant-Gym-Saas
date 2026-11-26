import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { PendingClient } from '@/components/leaderboard/pending-client';
import type { PrSubmission } from '@/types/api';

export const metadata: Metadata = { title: 'Pending lifts' };

export default async function PendingApprovalsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.permissions.includes('leaderboard.review')) redirect('/dashboard');

  const submissions = await api
    .get<PrSubmission[]>(`/gyms/${user.gymId}/leaderboard/submissions/pending`)
    .catch(() => [] as PrSubmission[]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/leaderboard"
          className="text-muted-foreground hover:text-foreground transition text-sm"
        >
          ← Leaderboard
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      <PendingClient submissions={submissions} gymId={user.gymId} />
    </div>
  );
}
