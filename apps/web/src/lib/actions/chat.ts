'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types/api';

export async function sendMessage(
  gymId: string,
  conversationId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const content = (formData.get('content') as string | null)?.trim() ?? '';
  if (!content) return { error: 'Message cannot be empty.' };

  try {
    await api.post<ChatMessage>(
      `/gyms/${gymId}/conversations/${conversationId}/messages`,
      { content },
    );
    revalidatePath('/dashboard/chat');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to send message.' };
  }
}

export async function deleteMessage(
  gymId: string,
  conversationId: string,
  messageId: string,
): Promise<{ error?: string }> {
  try {
    await api.delete(`/gyms/${gymId}/conversations/${conversationId}/messages/${messageId}`);
    revalidatePath('/dashboard/chat');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message ?? 'Failed to delete message.' };
  }
}
