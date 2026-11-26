import type { ReactNode } from 'react';
import { requireAdminSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { InternalBar } from '@/components/brand/internal-bar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminSession();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <InternalBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar email={admin.email} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
