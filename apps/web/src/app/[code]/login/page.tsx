import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; name?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { type = 'gym', name } = await searchParams;
  const loginType = type === 'org' ? 'org' : 'gym';

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-4">
            <span className="text-3xl">🐔</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          {name && (
            <p className="text-sm text-primary mt-1 font-medium">{decodeURIComponent(name)}</p>
          )}
          {!name && (
            <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-widest">{code}</p>
          )}
        </div>

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
  );
}
