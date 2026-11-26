import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from './reset-password-form';
import { FitOpsLockup } from '@/components/brand/fitops-mark';
import { VerSolutionsEndorsement } from '@/components/brand/versolutions-endorsement';

export const metadata: Metadata = { title: 'Set new password' };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect('/forgot-password');

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <FitOpsLockup size={40} className="mb-6" />
          <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a strong password for your account
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <ResetPasswordForm token={token} />
        </div>

        <VerSolutionsEndorsement className="text-center mt-6" />
      </div>
    </main>
  );
}
