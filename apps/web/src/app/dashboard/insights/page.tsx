import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InsightsChatClient } from '@/components/insights/chat-client';

export default async function InsightsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  if (!user.permissions.includes('insights.query')) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-border px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ask questions about your gym — members, attendance, revenue, and trends.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <InsightsChatClient gymId={user.gymId} />
      </div>
    </div>
  );
}
