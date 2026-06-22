import { ForgotPasswordForm } from './forgot-password-form';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <ForgotPasswordForm backCode={code} />
        </div>
      </div>
    </main>
  );
}
