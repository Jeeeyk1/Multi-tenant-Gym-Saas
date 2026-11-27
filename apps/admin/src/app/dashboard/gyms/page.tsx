import Link from 'next/link';
import type { Metadata } from 'next';
import { addOutline, businessOutline, cloudOfflineOutline } from 'ionicons/icons';
import { GymStatus } from '@gym-saas/contracts';
import { EmptyState, Icon, PageHeader, Pagination, StatusPill, buttonClasses, type StatusTone } from '@gym-saas/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { GymAvatar } from '@/components/gyms/gym-avatar';
import { ListToolbar } from '@/components/tables/list-toolbar';

export const metadata: Metadata = { title: 'Gyms' };

const PAGE_SIZE = 20;

const GYM_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  [GymStatus.ACTIVE]: { label: 'Active', tone: 'success' },
  [GymStatus.PENDING]: { label: 'Pending', tone: 'info' },
  [GymStatus.SUSPENDED]: { label: 'Suspended', tone: 'warning' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: GymStatus.ACTIVE, label: 'Active' },
  { value: GymStatus.PENDING, label: 'Pending' },
  { value: GymStatus.SUSPENDED, label: 'Suspended' },
];

interface Gym {
  id: string;
  name: string;
  code: string;
  status: string;
  city: string | null;
  createdAt: string;
  organization: { name: string; slug: string };
  profile: { logoUrl: string | null; primaryColor: string | null } | null;
  _count: { members: number; staff: number };
}

interface GymsResponse {
  gyms: Gym[];
  total: number;
  pages: number;
}

type Search = { page?: string; search?: string; status?: string };

export default async function GymsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? '';
  const status = Object.values(GymStatus).includes(params.status as GymStatus) ? params.status! : '';

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  const data = await api.get<GymsResponse>(`/v1/admin/gyms?${query}`).catch(() => null);

  const hrefFor = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (p > 1) q.set('page', String(p));
    const qs = q.toString();
    return qs ? `/dashboard/gyms?${qs}` : '/dashboard/gyms';
  };
  const filtered = Boolean(search || status);

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <PageHeader
        eyebrow="FitOps"
        title="Gyms"
        description={data ? `${data.total.toLocaleString('en-US')} ${filtered ? 'matching' : 'total'}` : undefined}
        actions={
          <Link href="/dashboard/gyms/new" className={buttonClasses('primary', 'md')}>
            <Icon icon={addOutline} size={18} />
            Invite gym client
          </Link>
        }
      />

      <ListToolbar searchLabel="Search by name, code or city" statuses={STATUS_FILTERS} />

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {!data ? (
          <EmptyState icon={cloudOfflineOutline} tone="error" title="Couldn't load gyms" message="Check that the API is running, then reload the page." />
        ) : data.gyms.length === 0 ? (
          <EmptyState
            icon={businessOutline}
            title={filtered ? 'No gyms match' : 'No gyms yet'}
            message={filtered ? 'Try another search or status.' : 'Invite your first gym client to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-eyebrow uppercase text-muted">
                  <th className="px-4 py-3 font-semibold">Gym</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Members</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.gyms.map((gym) => (
                  <tr key={gym.id} className="border-b border-border transition-colors last:border-0 hover:bg-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <GymAvatar name={gym.name} logoUrl={gym.profile?.logoUrl} accent={gym.profile?.primaryColor} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{gym.name}</span>
                          {gym.city && <span className="text-xs text-muted">{gym.city}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{gym.code}</td>
                    <td className="px-4 py-3 text-muted">{gym.organization.name}</td>
                    <td className="tabular px-4 py-3 text-muted">{gym._count.members}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={GYM_STATUS[gym.status]?.tone ?? 'neutral'}>{GYM_STATUS[gym.status]?.label ?? gym.status}</StatusPill>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(gym.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/gyms/${gym.id}`} className="text-sm font-semibold text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > 0 ? (
        <Pagination page={page} pages={data.pages} total={data.total} pageSize={PAGE_SIZE} hrefFor={hrefFor} linkAs={Link} noun="gyms" />
      ) : null}
    </div>
  );
}
