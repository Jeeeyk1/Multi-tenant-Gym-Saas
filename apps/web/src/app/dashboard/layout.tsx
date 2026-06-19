import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionUser } from '@/lib/auth';
import { getGymDetail } from '@/lib/actions/settings';
import { hexToHsl } from '@/lib/utils';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect('/');

  const gymDetail = await getGymDetail().catch(() => null);

  const primaryHsl = gymDetail?.profile?.primaryColor
    ? hexToHsl(gymDetail.profile.primaryColor)
    : null;
  const secondaryHsl = gymDetail?.profile?.secondaryColor
    ? hexToHsl(gymDetail.profile.secondaryColor)
    : null;

  const cssVars = [
    primaryHsl && `--primary: ${primaryHsl};`,
    secondaryHsl && `--secondary: ${secondaryHsl};`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {cssVars && <style>{`:root { ${cssVars} }`}</style>}
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          permissions={user.permissions}
          userName={user.fullName || user.email}
          gymCode={user.gymCode}
          gymName={gymDetail?.name}
          logoUrl={gymDetail?.profile?.logoUrl}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
}
