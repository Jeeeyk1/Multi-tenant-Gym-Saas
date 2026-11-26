import type { Metadata } from 'next';
import Link from 'next/link';
import { FitOpsMark } from '@/components/brand/fitops-mark';

export const metadata: Metadata = { title: 'Use the app' };

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ as?: string }>;
}

const COPY = {
  member: {
    title: 'Members use the mobile app',
    body: 'This portal is for gym owners and staff. If you’re a member, download the FitOps app to check in, train and see your membership.',
  },
  trainer: {
    title: 'Trainers use the mobile app',
    body: 'Check members in, moderate the community chat, review PRs and award badges from the FitOps app. Sign in there with the same email and password.',
  },
} as const;

export default async function NotStaffPage({ params, searchParams }: Props) {
  const [{ code }, { as }] = await Promise.all([params, searchParams]);
  const copy = as === 'trainer' ? COPY.trainer : COPY.member;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <FitOpsMark size={64} className="mb-6" />
        <h1 className="text-xl font-bold text-foreground mb-2">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{copy.body}</p>
        <Link href={`/${code}/login`} className="text-sm text-primary font-medium hover:underline">
          ← Back to login
        </Link>
      </div>
    </main>
  );
}
