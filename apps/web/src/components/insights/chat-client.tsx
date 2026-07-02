'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { queryInsights, type HistoryTurn } from '@/lib/actions/insights';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  error?: boolean;
}

const SUGGESTIONS = [
  'How many active members do we have?',
  'How much revenue did we make this month?',
  'How many check-ins happened today?',
  'Show me check-ins per day for the last 2 weeks.',
];

export function InsightsChatClient({ gymId }: { gymId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  function buildHistory(): HistoryTurn[] {
    return messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    startTransition(async () => {
      const history = buildHistory();
      const result = await queryInsights(gymId, trimmed, history);

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.error!, error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.data!.answer,
            toolsUsed: result.data!.toolsUsed,
          },
        ]);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
        {isEmpty && !isPending ? (
          <EmptyState onSuggest={(q) => send(q)} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isPending && <ThinkingBubble />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-4 bg-surface">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            rows={1}
            placeholder="Ask anything about your gym…"
            className={cn(
              'flex-1 resize-none bg-background border border-border rounded-xl px-4 py-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary/40',
              'disabled:opacity-50 transition',
            )}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isPending}
            className={cn(
              'shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition',
              'bg-primary text-primary-foreground hover:opacity-90',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Send
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Press Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-2xl space-y-1.5', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary/10 text-foreground border border-primary/20'
              : message.error
                ? 'bg-destructive/5 text-destructive border border-destructive/20'
                : 'bg-surface border border-border text-foreground',
          )}
        >
          {message.content}
        </div>
        {!isUser && message.toolsUsed && message.toolsUsed.length > 0 && (
          <ToolsBadge tools={message.toolsUsed} />
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
        <span className="animate-pulse">●</span>
        <span className="animate-pulse delay-75">●</span>
        <span className="animate-pulse delay-150">●</span>
      </div>
    </div>
  );
}

function ToolsBadge({ tools }: { tools: string[] }) {
  const labels: Record<string, string> = {
    find_member: 'members',
    get_member_checkin_status: 'check-in status',
    query_metric: 'metrics',
    get_trend: 'trend data',
  };
  const names = [...new Set(tools.map((t) => labels[t] ?? t))];

  return (
    <p className="text-xs text-muted-foreground px-1">
      ✦ Queried {names.join(', ')}
    </p>
  );
}

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
      <div className="text-center space-y-2">
        <p className="text-2xl font-semibold text-foreground">Ask your gym anything</p>
        <p className="text-sm text-muted-foreground">
          Get instant answers about members, attendance, revenue, and trends.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            className={cn(
              'text-left px-4 py-3 rounded-xl border border-border bg-surface',
              'text-sm text-muted-foreground hover:text-foreground hover:border-primary/30',
              'transition',
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
