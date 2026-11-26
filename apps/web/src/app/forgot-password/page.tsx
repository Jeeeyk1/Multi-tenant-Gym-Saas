import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';
import { FitOpsLockup } from '@/components/brand/fitops-mark';
import { VerSolutionsEndorsement } from '@/components/brand/versolutions-endorsement';

export const metadata: Metadata = { title: 'Forgot password' };

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <FitOpsLockup size={40} className="mb-6" />
          <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <ForgotPasswordForm backCode={code} />
        </div>

        <VerSolutionsEndorsement className="text-center mt-6" />
      </div>
    </main>
  );
}
