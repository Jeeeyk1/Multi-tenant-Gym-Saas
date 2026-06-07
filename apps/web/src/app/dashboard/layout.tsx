import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionUser } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect('/');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        permissions={user.permissions}
        userName={user.fullName || user.email}
        gymCode={user.gymCode}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
