import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { FitOpsLockup } from '@/components/brand/fitops-mark';
import { VerSolutionsEndorsement } from '@/components/brand/versolutions-endorsement';

export const metadata: Metadata = { title: 'Sign in' };

async function fetchGymName(code: string): Promise<string | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api/v1';
    const res = await fetch(`${apiUrl}/auth/resolve-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; name?: string; activated?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { type = 'gym', name, activated } = await searchParams;
  const loginType = type === 'org' ? 'org' : 'gym';

  // Direct visits (e.g. a bookmark) have no query params, so ask the API.
  const gymName = name ?? (await fetchGymName(code));

  return (
    <>
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <FitOpsLockup size={40} className="mb-6" />
            <h1 className="text-2xl font-bold text-foreground">Sign in to FitOps</h1>
            {gymName && <p className="text-sm text-muted-foreground mt-1">for {gymName}</p>}
            <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-widest">{code}</p>
          </div>

          {activated === '1' && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-success-bg border border-success/30 text-sm text-success text-center font-medium">
              ✓ Account activated! Sign in below to get started.
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-6">
            <LoginForm code={code} type={loginType} />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link href="/" className="text-primary hover:underline">
              ← Change code
            </Link>
          </p>

          <VerSolutionsEndorsement className="text-center mt-4" />
        </div>
      </main>
    </>
  );
}
