import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Gym {
  id: string;
  name: string;
  code: string;
  status: string;
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Gyms</h1>
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
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Gym</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Members</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.gyms.map((gym) => (
                <tr key={gym.id} className="border-b border-border last:border-0 hover:bg-foreground/5 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {gym.profile?.logoUrl ? (
                        <img src={gym.profile.logoUrl} alt="" className="w-7 h-7 rounded-md object-contain bg-surface border border-border" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-black"
                          style={{ backgroundColor: gym.profile?.primaryColor ?? '#6EE7B7' }}
                        >
                          {gym.name[0]}
                        </div>
                      )}
                      <span className="font-medium text-foreground">{gym.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{gym.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gym.organization.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{gym._count.members}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      gym.status === 'ACTIVE'
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {gym.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(gym.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/gyms/${gym.id}`} className="text-primary text-xs hover:underline">
                      View →
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
