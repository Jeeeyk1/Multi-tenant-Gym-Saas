'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
  cancelInsightsAction,
  confirmInsightsAction,
  getAiUsage,
  queryInsights,
  type HistoryTurn,
} from '@/lib/actions/insights';
import { ActionCard, isExpired, type ActionStatus } from './action-card';
import { UsageMeter, isPaused, usageState } from './usage-meter';
import { ToolResultView } from './tool-result-views';
import type { AiUsageView, InsightsPendingAction, InsightsStep } from '@/types/api';

const HISTORY_TURNS = 6;
const STEP_REVEAL_MS = 450;
const REVEAL_SETTLE_MS = 350;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: InsightsStep[];
  error?: boolean;
  pendingAction?: InsightsPendingAction | null;
}

interface RevealState {
  answer: string;
  steps: InsightsStep[];
  pendingAction: InsightsPendingAction | null;
  revealedCount: number;
}

// What the assistant reads back about an action card, so it knows what was proposed and what happened.
const STATUS_FOR_HISTORY: Record<ActionStatus, string> = {
  waiting: 'not confirmed yet',
  running: 'not confirmed yet',
  expired: 'expired, not done',
  done: 'confirmed and done',
  cancelled: 'cancelled by the user',
  failed: 'failed',
};

const SUGGESTIONS = [
  'How many active members do we have?',
  'How many check-ins happened today?',
  'How many members joined this month?',
  'Show me check-ins per day for the last 2 weeks.',
];
const REVENUE_SUGGESTION = 'How much revenue did we make this month?';

export function InsightsChatClient({ gymId, initialUsage }: { gymId: string; initialUsage: AiUsageView | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [usage, setUsage] = useState(initialUsage);
  // Set by a limit error, so the input pauses even if the meter couldn't be loaded.
  const [limitHit, setLimitHit] = useState(false);
  const paused = limitHit || isPaused(usageState(usage));
  const canAskRevenue = usage?.canAskRevenue ?? false;
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, ActionStatus>>({});
  // Ids already confirmed or cancelled. A ref, not state, so a fast double tap is caught before the re-render.
  const handledActions = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A paused tab can't send, so nothing else would refresh it (e.g. after midnight). Recheck on return.
  useEffect(() => {
    if (!paused) return;
    function recheck() {
      if (document.visibilityState !== 'visible') return;
      getAiUsage(gymId).then((next) => {
        if (!next) return;
        setUsage(next);
        setLimitHit(false);
      });
    }
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, [paused, gymId]);

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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reveal.answer, steps: reveal.steps, pendingAction: reveal.pendingAction },
      ]);
      setReveal(null);
    }, REVEAL_SETTLE_MS);
    return () => clearTimeout(t);
  }, [reveal]);

  // The assistant only reads the last few turns; sending more just fails validation on long chats.
  function buildHistory(): HistoryTurn[] {
    return messages
      .filter((m) => !m.error)
      .slice(-HISTORY_TURNS)
      .map((m) => ({
        role: m.role,
        content: m.pendingAction
          ? `${m.content}\nProposed: ${m.pendingAction.summary} (${STATUS_FOR_HISTORY[actionStatus[m.pendingAction.id] ?? 'waiting']})`
          : m.content,
      }));
  }

  async function confirmAction(action: InsightsPendingAction) {
    if (handledActions.current.has(action.id)) return;
    handledActions.current.add(action.id);
    if (isExpired(action.expiresAt)) {
      setActionStatus((prev) => ({ ...prev, [action.id]: 'expired' }));
      return;
    }
    setActionStatus((prev) => ({ ...prev, [action.id]: 'running' }));
    const result = await confirmInsightsAction(gymId, action.id);
    setActionStatus((prev) => ({ ...prev, [action.id]: result.error ? 'failed' : 'done' }));
    setMessages((prev) => [
      ...prev,
      result.error
        ? { role: 'assistant', content: result.error, error: true }
        : { role: 'assistant', content: result.message ?? 'Done.' },
    ]);
  }

  function cancelAction(action: InsightsPendingAction) {
    if (handledActions.current.has(action.id)) return;
    handledActions.current.add(action.id);
    setActionStatus((prev) => ({ ...prev, [action.id]: 'cancelled' }));
    void cancelInsightsAction(gymId, action.id);
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending || paused) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    startTransition(async () => {
      const history = buildHistory();
      const result = await queryInsights(gymId, trimmed, history);
      // Every answer (and every limit error) changes the meter.
      getAiUsage(gymId).then((next) => next && setUsage(next));

      if (result.error) {
        if (result.limit) setLimitHit(true);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.error!, error: true },
        ]);
        return;
      }

      const { answer, steps, pendingAction } = result.data!;
      if (steps.length === 0) {
        // Pure conversational turn — nothing was looked up, so there's nothing to trace.
        setMessages((prev) => [...prev, { role: 'assistant', content: answer, steps, pendingAction }]);
      } else {
        setReveal({ answer, steps, pendingAction, revealedCount: 0 });
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
          <EmptyState onSuggest={(q) => send(q)} canAskRevenue={canAskRevenue} disabled={paused} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                message={msg}
                actionStatus={msg.pendingAction ? (actionStatus[msg.pendingAction.id] ?? 'waiting') : undefined}
                onConfirm={confirmAction}
                onCancel={cancelAction}
              />
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
        <UsageMeter usage={usage} />
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || paused}
            rows={1}
            placeholder={paused ? 'The assistant is paused for now' : 'Ask anything about your gym…'}
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
            disabled={!input.trim() || isPending || paused}
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

function ChatBubble({
  message,
  actionStatus,
  onConfirm,
  onCancel,
}: {
  message: Message;
  actionStatus?: ActionStatus;
  onConfirm: (action: InsightsPendingAction) => void;
  onCancel: (action: InsightsPendingAction) => void;
}) {
  const action = message.pendingAction;
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
        {action && actionStatus && (
          <ActionCard
            action={action}
            status={actionStatus}
            onConfirm={() => onConfirm(action)}
            onCancel={() => onCancel(action)}
          />
        )}
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

function EmptyState({
  onSuggest,
  canAskRevenue,
  disabled,
}: {
  onSuggest: (q: string) => void;
  canAskRevenue: boolean;
  disabled: boolean;
}) {
  const suggestions = canAskRevenue ? [SUGGESTIONS[0], REVENUE_SUGGESTION, ...SUGGESTIONS.slice(1, 3)] : SUGGESTIONS;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
      <div className="text-center space-y-2">
        <p className="text-2xl font-heading font-bold text-foreground">Ask your gym anything</p>
        <p className="text-sm text-muted-foreground">
          Get instant answers about members, attendance{canAskRevenue ? ', revenue' : ''} and trends.
        </p>
      </div>

      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">What I can do</p>
          <ul className="space-y-1 text-foreground">
            <li>Look up members and who checked in</li>
            <li>Count members, check-ins and renewals</li>
            <li>Show trends over days, weeks or months</li>
            {canAskRevenue && <li>Report revenue from renewals</li>}
            <li>Register, renew or suspend a member (nothing happens until you confirm)</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">What I can&apos;t do</p>
          <ul className="space-y-1 text-muted-foreground">
            {!canAskRevenue && <li>Revenue figures (owner only)</li>}
            <li>Change settings, plans or staff</li>
            <li>Read chats or members&apos; health data</li>
            <li>Remember past conversations</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            disabled={disabled}
            className={cn(
              'text-left px-4 py-3 rounded-md border border-border bg-surface font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
              'text-sm text-muted-foreground hover:text-foreground hover:border-primary/30',
              'transition disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
