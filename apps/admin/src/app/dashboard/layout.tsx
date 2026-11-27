import type { ReactNode } from 'react';
import { requireAdminSession } from '@/lib/auth';
import { AdminShell } from '@/components/layout/admin-shell';
import { InternalBar } from '@/components/brand/internal-bar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminSession();
  return (
    <AdminShell email={admin.email} banner={<InternalBar />}>
      {children}
    </AdminShell>
  );
}
