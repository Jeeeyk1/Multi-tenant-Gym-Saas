import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { getOr } from '@/lib/api';
import { ChatFeed } from '@/components/chat/chat-feed';
import { equippedByUser } from '@/components/badges/equipped';
import type { ChatMessage, Conversation, EquippedBadgeRow } from '@/types/api';

export const metadata: Metadata = { title: 'Chat' };

export default async function CommunityChatPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.permissions.includes('chat.manage')) redirect('/dashboard');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [conversation, equippedRows] = await Promise.all([
    getOr<Conversation, null>(`/gyms/${user.gymId}/conversations/default`, null),
    getOr<EquippedBadgeRow[]>(`/gyms/${user.gymId}/badges/equipped`, []),
  ]);
  const equipped = equippedByUser(equippedRows);

  const messages = conversation
    ? await getOr<ChatMessage[]>(`/gyms/${user.gymId}/conversations/${conversation.id}/messages?limit=100`, [])
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-border shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Community Chat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gym-wide community feed · staff moderation enabled
        </p>
      </div>

      {!conversation ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No community conversation found for this gym.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ChatFeed
            token={token}
            gymId={user.gymId}
            conversationId={conversation.id}
            initialMessages={messages}
            currentUserId={user.id}
            equippedBadges={equipped}
          />
        </div>
      )}
    </div>
  );
}
