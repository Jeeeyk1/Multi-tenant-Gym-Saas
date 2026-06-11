import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { MembersTable } from '@/components/members/members-table';
import type { MembersPage } from '@/types/api';

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function MembersPage({ searchParams }: Props) {
  const [user, { page: pageParam }] = await Promise.all([getSessionUser(), searchParams]);
  if (!user) return null;

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const membersPage = await api
    .get<MembersPage>(`/gyms/${user.gymId}/members?page=${page}&limit=${PAGE_SIZE}`)
    .catch(() => null);

  const members = membersPage?.data ?? [];
  const meta = membersPage?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.total} member{meta.total !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <Link
          href="/dashboard/members/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          Register Member
        </Link>
      </div>

      <MembersTable members={members} />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/members?page=${page - 1}`}
                className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={`/dashboard/members?page=${page + 1}`}
                className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
