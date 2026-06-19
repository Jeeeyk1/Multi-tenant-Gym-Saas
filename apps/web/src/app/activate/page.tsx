import { redirect } from 'next/navigation';
import { ActivateForm } from './activate-form';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivatePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect('/');

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
              <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
              <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a password to activate your account
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <ActivateForm token={token} />
        </div>
      </div>
    </main>
  );
}
