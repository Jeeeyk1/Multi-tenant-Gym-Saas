import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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
}

export default async function UsersPage() {
  const data = await api.get<UsersResponse>('/v1/admin/users?limit=50').catch(() => null);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Users</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total across all gyms</p>
      </div>

      {!data ? (
        <p className="text-muted-foreground text-sm">Could not load users.</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Gym(s)</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => {
                const staffGyms = user.gymStaff.map((s) => `${s.gym.name} (${s.roles.map((r) => r.role.name).join(', ')})`);
                const memberGyms = user.gymMembers.map((m) => m.gym.name);
                const gymLabel = [...staffGyms, ...memberGyms].join(', ') || '—';
                const roleLabel = user.gymStaff.length > 0 ? 'Staff' : user.gymMembers.length > 0 ? 'Member' : '—';

                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-foreground/5 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{gymLabel}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(user.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
