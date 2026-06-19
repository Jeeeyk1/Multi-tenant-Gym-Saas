import type { ReactNode } from 'react';
import { requireAdminSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminSession();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar email={admin.email} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
