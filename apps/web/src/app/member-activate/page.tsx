import { redirect } from 'next/navigation';
import { MemberActivateForm } from './activate-form';

interface Props {
  searchParams: Promise<{ token?: string; code?: string }>;
}

export default async function MemberActivatePage({ searchParams }: Props) {
  const { token, code } = await searchParams;

  if (!token) redirect('/');

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Activate your membership</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a password to access your account on the mobile app
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <MemberActivateForm token={token} gymCode={code ?? ''} />
        </div>

        {code && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Gym code: <span className="font-mono font-semibold text-foreground uppercase">{code}</span>
            {' '}— you'll need this to sign in on the mobile app.
          </p>
        )}
      </div>
    </main>
  );
}
