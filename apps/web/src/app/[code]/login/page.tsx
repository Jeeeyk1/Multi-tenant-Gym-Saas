import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { hexToHsl } from '@/lib/utils';

interface GymBranding {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

async function fetchGymBranding(code: string): Promise<GymBranding> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${apiUrl}/auth/resolve-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return { name: null, logoUrl: null, primaryColor: null, secondaryColor: null };
    const data = await res.json() as {
      name?: string;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
    };
    return {
      name: data.name ?? null,
      logoUrl: data.logoUrl ?? null,
      primaryColor: data.primaryColor ?? null,
      secondaryColor: data.secondaryColor ?? null,
    };
  } catch {
    return { name: null, logoUrl: null, primaryColor: null, secondaryColor: null };
  }
}

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; name?: string; logo?: string; primary?: string; secondary?: string; activated?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { type = 'gym', name, logo, primary, secondary, activated } = await searchParams;
  const loginType = type === 'org' ? 'org' : 'gym';

  // Branding from query params (code-entry flow) takes priority.
  // If missing (subdomain flow), fetch directly from the API.
  let gymName = name ? decodeURIComponent(name) : null;
  let logoUrl = logo ? decodeURIComponent(logo) : null;
  let primaryRaw = primary ? decodeURIComponent(primary) : null;
  let secondaryRaw = secondary ? decodeURIComponent(secondary) : null;

  if (!gymName && !logoUrl && !primaryRaw) {
    const branding = await fetchGymBranding(code);
    gymName = branding.name;
    logoUrl = branding.logoUrl;
    primaryRaw = branding.primaryColor;
    secondaryRaw = branding.secondaryColor;
  }

  const primaryHsl = primaryRaw ? hexToHsl(primaryRaw) : null;
  const secondaryHsl = secondaryRaw ? hexToHsl(secondaryRaw) : null;
  const cssVars = [
    primaryHsl && `--primary: ${primaryHsl};`,
    secondaryHsl && `--secondary: ${secondaryHsl};`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {cssVars && <style>{`:root { ${cssVars} }`}</style>}
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          {/* Gym identity header */}
          <div className="text-center mb-10">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={gymName ?? 'Gym logo'}
                className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4 border border-border bg-surface"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
                  <path d="M3 9.5h2v5H3z" /><path d="M19 9.5h2v5h-2z" />
                  <path d="M1 11h2v2H1z" /><path d="M21 11h2v2h-2z" />
                </svg>
              </div>
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
            <div className="mb-4 px-4 py-3 rounded-xl bg-success/10 border border-success/30 text-sm text-success text-center font-medium">
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
