import Link from 'next/link';
import { api } from '@/lib/api';
import type { Metadata } from 'next';
import { formatDate } from '@/lib/utils';
import { GymAvatar, StatusTag, type Tone } from '@/components/gyms/gym-avatar';

export const metadata: Metadata = { title: 'Gyms' };

const GYM_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'green' },
  PENDING: { label: 'Pending', tone: 'blue' },
  SUSPENDED: { label: 'Suspended', tone: 'orange' },
};

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

export default async function GymsPage() {
  const data = await api.get<GymsResponse>('/v1/admin/gyms?limit=50').catch(() => null);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[13px] text-muted-foreground">FitOps</p>
          <h1 className="text-[30px] text-foreground">Gyms</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total</p>
        </div>
        <Link
          href="/dashboard/gyms/new"
          className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          + Invite Gym Client
        </Link>
      </div>

      {!data ? (
        <p className="text-muted-foreground text-sm">Could not load gyms.</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs bg-background">
                <th className="text-left font-medium px-4 py-2.5">Gym</th>
                <th className="text-left font-medium px-4 py-2.5">Code</th>
                <th className="text-left font-medium px-4 py-2.5">Organization</th>
                <th className="text-left font-medium px-4 py-2.5">Members</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-left font-medium px-4 py-2.5">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.gyms.map((gym) => (
                <tr key={gym.id} className="border-b border-border last:border-0 hover:bg-foreground/5 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GymAvatar name={gym.name} logoUrl={gym.profile?.logoUrl} accent={gym.profile?.primaryColor} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{gym.name}</span>
                        {gym.city && <span className="text-xs text-muted-foreground">{gym.city}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{gym.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gym.organization.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gym._count.members}</td>
                  <td className="px-4 py-3">
                    <StatusTag tone={GYM_STATUS[gym.status]?.tone ?? 'grey'}>
                      {GYM_STATUS[gym.status]?.label ?? gym.status}
                    </StatusTag>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(gym.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/gyms/${gym.id}`} className="text-primary text-[13px] font-semibold hover:text-foreground">
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
  );
}
