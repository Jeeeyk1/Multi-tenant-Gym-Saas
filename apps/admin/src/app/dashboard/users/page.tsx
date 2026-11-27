import Link from 'next/link';
import type { Metadata } from 'next';
import { cloudOfflineOutline, peopleOutline } from 'ionicons/icons';
import { EmptyState, PageHeader, Pagination, StatusPill } from '@gym-saas/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ListToolbar } from '@/components/tables/list-toolbar';

export const metadata: Metadata = { title: 'Users' };

const PAGE_SIZE = 20;

interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  gymStaff: { gym: { name: string; code: string }; roles: { role: { name: string } }[] }[];
  gymMembers: { gym: { name: string; code: string }; status: string }[];
}

interface UsersResponse {
  users: User[];
  total: number;
  pages: number;
}

type Search = { page?: string; search?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? '';

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) query.set('search', search);
  const data = await api.get<UsersResponse>(`/v1/admin/users?${query}`).catch(() => null);

  const hrefFor = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (p > 1) q.set('page', String(p));
    const qs = q.toString();
    return qs ? `/dashboard/users?${qs}` : '/dashboard/users';
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <PageHeader
        eyebrow="FitOps"
        title="Users"
        description={data ? `${data.total.toLocaleString('en-US')} ${search ? 'matching' : 'across all gyms'}` : undefined}
      />

      <ListToolbar searchLabel="Search by name or email" />

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {!data ? (
          <EmptyState icon={cloudOfflineOutline} tone="error" title="Couldn't load users" message="Check that the API is running, then reload the page." />
        ) : data.users.length === 0 ? (
          <EmptyState icon={peopleOutline} title={search ? 'No users match' : 'No users yet'} message={search ? 'Try another name or email.' : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-eyebrow uppercase text-muted">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Gyms</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => {
                  const staffGyms = user.gymStaff.map((s) => `${s.gym.name} (${s.roles.map((r) => r.role.name).join(', ')})`);
                  const memberGyms = user.gymMembers.map((m) => m.gym.name);
                  const gymLabel = [...staffGyms, ...memberGyms].join(', ') || '—';
                  const roleLabel = user.gymStaff.length > 0 ? 'Staff' : user.gymMembers.length > 0 ? 'Member' : '—';
                  return (
                    <tr key={user.id} className="border-b border-border transition-colors last:border-0 hover:bg-hover">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{user.fullName}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-muted" title={gymLabel}>
                        {gymLabel}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-muted">{roleLabel}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Inactive'}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDate(user.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > 0 ? (
        <Pagination page={page} pages={data.pages} total={data.total} pageSize={PAGE_SIZE} hrefFor={hrefFor} linkAs={Link} noun="users" />
      ) : null}
    </div>
  );
}
