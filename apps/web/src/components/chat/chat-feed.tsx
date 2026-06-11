'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { deleteMessage } from '@/lib/actions/chat';
import type { ChatMessage } from '@/types/api';

const WS_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '').replace('/api', '')
  : 'http://127.0.0.1:3000';

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  token: string;
  gymId: string;
  conversationId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
}

export function ChatFeed({ token, gymId, conversationId, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages].reverse());
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { conversationId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('message.new', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('message.deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: '' } : m,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token, conversationId]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = input.trim();
      if (!content || sending || !socketRef.current?.connected) return;

      setSendError(null);
      setSending(true);

      socketRef.current.emit(
        'message.send',
        { conversationId, content },
        (ack: { ok?: boolean; error?: string; message?: string }) => {
          setSending(false);
          if (ack?.error) {
            setSendError(ack.message ?? 'Failed to send message.');
          } else {
            setInput('');
          }
        },
      );
    },
    [input, sending, conversationId],
  );

  async function handleDelete(msgId: string) {
    if (!confirm('Delete this message?')) return;
    setDeletingId(msgId);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message.delete', { conversationId, messageId: msgId });
      } else {
        await deleteMessage(gymId, conversationId, msgId);
      }
    } finally {
      setDeletingId(null);
    }
  }

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = formatDate(msg.sentAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === label) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date: label, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Connection status bar */}
      {!connected && (
        <div className="px-5 py-1.5 text-xs text-center bg-warning/10 text-warning border-b border-warning/20 shrink-0">
          Connecting to live chat…
        </div>
      )}

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <p className="text-xs text-muted-foreground font-medium">{group.date}</p>
              <div className="flex-1 h-px bg-border" />
            </div>

            {group.msgs.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex gap-3 items-start group py-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">{getInitials(msg.sender.fullName)}</span>
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {/* Sender name */}
                    {!isOwn && (
                      <p className="text-xs text-muted-foreground font-medium px-1">{msg.sender.fullName}</p>
                    )}

                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground line-clamp-1 w-full">
                        ↩ {msg.replyTo.isDeleted ? 'Deleted message' : msg.replyTo.content}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`relative px-3 py-2 rounded-2xl text-sm ${
                      msg.isDeleted
                        ? 'bg-background border border-border text-muted-foreground italic'
                        : isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface border border-border text-foreground'
                    }`}>
                      {msg.isDeleted ? 'This message was deleted' : msg.content}
                    </div>

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className="flex gap-1 flex-wrap px-1">
                        {Object.entries(
                          msg.reactions.reduce<Record<string, number>>((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                            return acc;
                          }, {}),
                        ).map(([emoji, count]) => (
                          <span key={emoji} className="text-xs bg-surface border border-border rounded-full px-2 py-0.5">
                            {emoji} {count}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Time + delete */}
                    <div className={`flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <p className="text-xs text-muted-foreground">{formatTime(msg.sentAt)}</p>
                      {!msg.isDeleted && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          disabled={deletingId === msg.id}
                          className="text-xs text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100 disabled:opacity-40"
                        >
                          {deletingId === msg.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send box */}
      <div className="border-t border-border p-4 shrink-0">
        {sendError && <p className="text-xs text-destructive mb-2">{sendError}</p>}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={connected ? 'Write a message…' : 'Connecting…'}
            disabled={sending || !connected}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !connected}
            className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
