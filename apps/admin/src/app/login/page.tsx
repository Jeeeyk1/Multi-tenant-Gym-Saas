import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import { InternalBar } from '@/components/brand/internal-bar';
import { VerSolutionsLogo } from '@/components/brand/versolutions';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const admin = await getAdminSession();
  if (admin) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <InternalBar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <VerSolutionsLogo className="text-foreground mb-5" />
            <h1 className="text-2xl text-foreground">VerSolutions Console</h1>
            <p className="text-sm text-muted-foreground mt-1">VerSolutions team access only</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
