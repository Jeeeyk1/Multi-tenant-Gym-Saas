import type { Metadata } from 'next';
import Link from 'next/link';
import { FitOpsMark } from '@/components/brand/fitops-mark';

export const metadata: Metadata = { title: 'Staff only' };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function NotStaffPage({ params }: Props) {
  const { code } = await params;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <FitOpsMark size={64} className="mb-6" />
        <h1 className="text-xl font-bold text-foreground mb-2">Members use the mobile app</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          This portal is for gym staff and owners only. If you&apos;re a member, download the FitOps
          mobile app to access your membership.
        </p>
        <Link
          href={`/${code}/login`}
          className="text-sm text-primary font-medium hover:underline"
        >
          ← Back to login
        </Link>
      </div>
    </main>
  );
}
