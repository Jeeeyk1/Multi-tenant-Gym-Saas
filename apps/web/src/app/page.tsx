import { CodeEntryForm } from '@/components/auth/code-entry-form';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-4">
            <span className="text-3xl">🐔</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">GainzOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff & Owner Portal</p>
        </div>

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
