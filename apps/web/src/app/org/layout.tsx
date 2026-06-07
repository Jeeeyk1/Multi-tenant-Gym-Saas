import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { logout } from '@/lib/auth';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user || user.type !== 'org') redirect('/');

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-base">🐔</span>
          <span className="text-sm font-semibold text-foreground">GainzOS</span>
          <span className="text-xs text-muted-foreground ml-2">Organization Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <form action={logout}>
            <button type="submit" className="text-xs text-muted-foreground hover:text-destructive transition">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
