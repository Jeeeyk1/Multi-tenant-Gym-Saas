import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';

export default async function RootPage() {
  const admin = await getAdminSession();
  if (admin) redirect('/dashboard');
  redirect('/login');
}
