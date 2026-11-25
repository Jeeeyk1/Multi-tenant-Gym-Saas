import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { FitOpsMark } from '@/components/brand/fitops-mark';

interface GymBranding {
  name: string | null;
  logoUrl: string | null;
}

async function fetchGymBranding(code: string): Promise<GymBranding> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001/api/v1';
    const res = await fetch(`${apiUrl}/auth/resolve-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return { name: null, logoUrl: null };
    const data = await res.json() as {
      name?: string;
      logoUrl?: string | null;
    };
    return {
      name: data.name ?? null,
      logoUrl: data.logoUrl ?? null,
    };
  } catch {
    return { name: null, logoUrl: null };
  }
}

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; name?: string; logo?: string; activated?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { type = 'gym', name, logo, activated } = await searchParams;
  const loginType = type === 'org' ? 'org' : 'gym';

  // Branding from query params (code-entry flow) takes priority.
  // If missing (subdomain flow), fetch directly from the API.
  let gymName = name ? decodeURIComponent(name) : null;
  let logoUrl = logo ? decodeURIComponent(logo) : null;
  if (!gymName && !logoUrl) {
    const branding = await fetchGymBranding(code);
    gymName = branding.name;
    logoUrl = branding.logoUrl;
  }

  return (
    <>
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          {/* Gym identity header */}
          <div className="text-center mb-10">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={gymName ?? 'Gym logo'}
                className="w-16 h-16 rounded-xl object-contain mx-auto mb-4 border border-border bg-surface"
              />
            ) : (
              <FitOpsMark size={64} className="mb-4" />
            )}
            {gymName ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">Welcome to</h1>
                <p className="text-xl font-semibold text-primary mt-0.5">{gymName}</p>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            )}
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
        </div>
      </main>
    </>
  );
}
