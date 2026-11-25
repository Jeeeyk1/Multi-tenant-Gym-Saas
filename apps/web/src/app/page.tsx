import { CodeEntryForm } from '@/components/auth/code-entry-form';
import { FitOpsMark } from '@/components/brand/fitops-mark';

interface Props {
  searchParams: Promise<{ activated?: string; reset?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { activated, reset } = await searchParams;

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-6 py-12 sm:py-16">
      {/* Subtle radial glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, hsl(var(--primary) / 0.10), transparent 55%)',
        }}
      />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Platform logo */}
        <div className="text-center">
          <FitOpsMark size={64} className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in with your gym or organization code
          </p>
        </div>

        {activated && (
          <div className="bg-success-bg border border-success/30 rounded-xl px-4 py-3 text-sm text-success text-center">
            Account activated! Enter your gym code to sign in.
          </div>
        )}

        {reset && (
          <div className="bg-success-bg border border-success/30 rounded-xl px-4 py-3 text-sm text-success text-center">
            Password reset! Enter your gym code to sign in with your new password.
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-7">
          <h2 className="text-lg font-semibold text-foreground mb-1">Enter your code</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your gym code or organization ID
          </p>
          <CodeEntryForm />
        </div>

        <p className="text-center text-xs text-muted-foreground px-2">
          Are you a member? Download the mobile app to check in and manage your membership.
        </p>
      </div>
    </main>
  );
}
