import { redirect } from 'next/navigation';
import { ActivateForm } from './activate-form';
import { FitOpsMark } from '@/components/brand/fitops-mark';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivatePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect('/');

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <FitOpsMark size={64} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a password to activate your account
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <ActivateForm token={token} />
        </div>
      </div>
    </main>
  );
}
