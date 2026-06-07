import { api } from './api';
import type { ChatMessage, Conversation } from '../types';

export const chatService = {
  getDefaultConversation: (gymId: string) =>
    api.get<Conversation>(`/gyms/${gymId}/conversations/default`),

  getMessages: (gymId: string, conversationId: string, limit = 50, before?: string) => {
    const query = before
      ? `?limit=${limit}&before=${encodeURIComponent(before)}`
      : `?limit=${limit}`;
    return api.get<ChatMessage[]>(`/gyms/${gymId}/conversations/${conversationId}/messages${query}`);
  },
};
