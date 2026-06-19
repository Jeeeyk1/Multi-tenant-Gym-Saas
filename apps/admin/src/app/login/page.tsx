import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const admin = await getAdminSession();
  if (admin) redirect('/dashboard');

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">System administrator access only</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
