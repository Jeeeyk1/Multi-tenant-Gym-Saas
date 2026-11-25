'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { queryInsights, type HistoryTurn } from '@/lib/actions/insights';
import { ToolResultView } from './tool-result-views';
import type { InsightsStep } from '@/types/api';

const STEP_REVEAL_MS = 450;
const REVEAL_SETTLE_MS = 350;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: InsightsStep[];
  error?: boolean;
}

interface RevealState {
  answer: string;
  steps: InsightsStep[];
  revealedCount: number;
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
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending, reveal]);

  // Steps are known all at once (the API isn't streaming yet), but we reveal them in sequence
  // — checkmark by checkmark — so the UI honestly shows what actually ran instead of a fake
  // generic spinner, then settles into the final answer once the trace finishes.
  useEffect(() => {
    if (!reveal) return;

    if (reveal.revealedCount < reveal.steps.length) {
      const t = setTimeout(() => {
        setReveal((r) => (r ? { ...r, revealedCount: r.revealedCount + 1 } : r));
      }, STEP_REVEAL_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: reveal.answer, steps: reveal.steps }]);
      setReveal(null);
    }, REVEAL_SETTLE_MS);
    return () => clearTimeout(t);
  }, [reveal]);

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
        return;
      }

      const { answer, steps } = result.data!;
      if (steps.length === 0) {
        // Pure conversational turn — nothing was looked up, so there's nothing to trace.
        setMessages((prev) => [...prev, { role: 'assistant', content: answer, steps }]);
      } else {
        setReveal({ answer, steps, revealedCount: 0 });
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
        {isEmpty && !isPending && !reveal ? (
          <EmptyState onSuggest={(q) => send(q)} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isPending && !reveal && <TraceBubble completed={[]} active="Thinking" />}
            {reveal && (
              <TraceBubble
                completed={['Thinking', ...reveal.steps.slice(0, reveal.revealedCount).map((s) => s.label)]}
                active={reveal.revealedCount < reveal.steps.length ? reveal.steps[reveal.revealedCount].label : null}
              />
            )}
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
              'flex-1 resize-none bg-surface border border-border rounded-md px-4 py-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-focus-ring',
              'disabled:opacity-50 transition',
            )}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isPending}
            className={cn(
              'shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition',
              'bg-primary text-primary-foreground hover:bg-primary-hover font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
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
  const dataSteps = (message.steps ?? []).filter((s) => s.data != null);

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-2xl space-y-2', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div
          className={cn(
            'px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary/10 text-foreground border border-primary/20'
              : message.error
                ? 'bg-destructive-bg text-destructive-text border border-destructive/20'
                : 'bg-surface border border-border text-foreground',
          )}
        >
          {message.content}
        </div>
        {!isUser && dataSteps.map((step, i) => (
          <ToolResultView key={i} tool={step.tool} data={step.data} />
        ))}
      </div>
    </div>
  );
}

// One trace bubble that grows: every completed line stays (with a check), and the currently
// running line shows a spinner beneath them. "Thinking" is the first line while we wait on the
// model, then stays checked as the real tool steps reveal one by one.
function TraceBubble({ completed, active }: { completed: string[]; active: string | null }) {
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-border rounded-xl px-4 py-3 space-y-2 min-w-[220px]">
        {completed.map((label, i) => (
          <TraceLine key={`done-${i}`} label={label} done />
        ))}
        {active && <TraceLine label={active} done={false} />}
      </div>
    </div>
  );
}

function TraceLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className="text-success shrink-0"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
      )}
      <span className={cn('text-xs', done ? 'text-muted-foreground' : 'text-foreground font-medium')}>
        {label}
      </span>
    </div>
  );
}

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
      <div className="text-center space-y-2">
        <p className="text-2xl font-heading font-bold text-foreground">Ask your gym anything</p>
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
              'text-left px-4 py-3 rounded-md border border-border bg-surface font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
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
