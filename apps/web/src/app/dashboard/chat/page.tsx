import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { ChatFeed } from '@/components/chat/chat-feed';
import type { ChatMessage, Conversation } from '@/types/api';

export default async function CommunityChatPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const conversation = await api
    .get<Conversation>(`/gyms/${user.gymId}/conversations/default`)
    .catch(() => null);

  const messages = conversation
    ? await api
        .get<ChatMessage[]>(
          `/gyms/${user.gymId}/conversations/${conversation.id}/messages?limit=100`,
        )
        .catch(() => [] as ChatMessage[])
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
          />
        </div>
      )}
    </div>
  );
}
