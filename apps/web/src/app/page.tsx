import { CodeEntryForm } from '@/components/auth/code-entry-form';

interface Props {
  searchParams: Promise<{ activated?: string; reset?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { activated, reset } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Platform logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
              <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
              <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Staff Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your gym or organization code</p>
        </div>

        {activated && (
          <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 mb-4 text-sm text-success text-center">
            Account activated! Enter your gym code to sign in.
          </div>
        )}

        {reset && (
          <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 mb-4 text-sm text-success text-center">
            Password reset! Enter your gym code to sign in with your new password.
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Enter your code</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your gym code or organization ID
          </p>
          <CodeEntryForm />
        </div>
      </div>
    </main>
  );
}
