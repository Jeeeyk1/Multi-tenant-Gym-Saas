import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAiUsage, useInsightsQuery } from '../../hooks/insights';
import { formatApiError } from '../../lib/format-error';
import { InsightsToolResultView } from '../../components/InsightsToolResultView';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { AiUsageView, InsightsHistoryTurn, InsightsStep } from '../../types';

const HISTORY_TURNS = 6;
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
  'How many check-ins today?',
  'How many members joined this month?',
  'Check-ins per day this week',
];
const REVENUE_SUGGESTION = 'How much revenue this month?';
const WARN_AT_PCT = 80;

/** API errors that mean "can't ask again until the allowance resets", so the input pauses. */
const LIMIT_CODES: readonly string[] = ['AI_ALLOWANCE_EXCEEDED', 'AI_DAILY_LIMIT_REACHED', 'FEATURE_NOT_AVAILABLE'];

type UsageState = 'ok' | 'warning' | 'paused' | 'unavailable';

/** Unavailable when the gym's plan doesn't include the assistant. Usage that hasn't loaded doesn't block. */
function usageState(usage: AiUsageView | undefined): UsageState {
  if (!usage) return 'ok';
  const a = usage.assistant;
  if (!a) return 'unavailable';
  if (a.pool.usedPct >= 100 || a.today.used >= a.today.limit) return 'paused';
  if (a.pool.usedPct >= WARN_AT_PCT || a.today.limit - a.today.used <= 3) return 'warning';
  return 'ok';
}

/** `day` is a calendar date (YYYY-MM-DD) in the gym's timezone, so it's formatted as-is, not shifted. */
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function usageMessage(usage: AiUsageView): string | null {
  const a = usage.assistant;
  if (!a) return "The AI assistant isn't included in your gym's current plan.";
  if (a.pool.usedPct >= 100) return `This month's AI allowance is used up. It resets on ${formatDay(a.pool.resetsOn)}.`;
  if (a.today.used >= a.today.limit) return `You've used today's ${a.today.limit} questions. Back tomorrow.`;
  if (a.pool.usedPct >= WARN_AT_PCT) return `${a.pool.usedPct}% of this month's AI allowance used · resets ${formatDay(a.pool.resetsOn)}`;
  return `${a.today.used} of ${a.today.limit} questions today`;
}

export default function StaffInsightsScreen() {
  const router = useRouter();
  const mutation = useInsightsQuery();
  const usageQ = useAiUsage();
  const state = usageState(usageQ.data);
  // Set by a limit error, so the input pauses even if usage couldn't be loaded. Fresh usage replaces it.
  const [limitHit, setLimitHit] = useState(false);
  useEffect(() => setLimitHit(false), [usageQ.dataUpdatedAt]);
  const paused = limitHit || state === 'paused' || state === 'unavailable';
  const canAskRevenue = usageQ.data?.canAskRevenue ?? false;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const listRef = useRef<FlatList>(null);

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

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending || paused) return;

    // The assistant only reads the last few turns; sending more just fails validation on long chats.
    const history: InsightsHistoryTurn[] = messages
      .filter((m) => !m.error)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');

    mutation.mutate(
      { message: trimmed, history },
      {
        onSuccess: (data) => {
          if (data.steps.length === 0) {
            // Pure conversational turn — nothing was looked up, so there's nothing to trace.
            setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, steps: data.steps }]);
          } else {
            setReveal({ answer: data.answer, steps: data.steps, revealedCount: 0 });
          }
        },
        onError: (err) => {
          const code = (err as { code?: string }).code;
          if (code && LIMIT_CODES.includes(code)) setLimitHit(true);
          const message = formatApiError(err, 'Something went wrong. Please try again.');
          setMessages((prev) => [...prev, { role: 'assistant', content: message, error: true }]);
        },
      },
    );
  };

  const isEmpty = messages.length === 0 && !mutation.isPending && !reveal;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>AI Assistant</Text>
      </View>

      {isEmpty ? (
        <EmptyState primary={COLORS.primary} onSuggest={send} canAskRevenue={canAskRevenue} disabled={paused} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <Bubble message={item} primary={COLORS.primary} />}
          ListFooterComponent={
            mutation.isPending && !reveal ? (
              <TraceBubble completed={[]} active="Thinking" primary={COLORS.primary} />
            ) : reveal ? (
              <TraceBubble
                completed={['Thinking', ...reveal.steps.slice(0, reveal.revealedCount).map((s) => s.label)]}
                active={reveal.revealedCount < reveal.steps.length ? reveal.steps[reveal.revealedCount].label : null}
                primary={COLORS.primary}
              />
            ) : null
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {usageQ.data && usageMessage(usageQ.data) && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.usageLine, state === 'warning' && { color: COLORS.warning }, state === 'paused' && { color: COLORS.error }]}
        >
          {usageMessage(usageQ.data)}
        </Text>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={paused ? 'The assistant is paused for now' : 'Ask about your gym…'}
          placeholderTextColor={COLORS.textMuted}
          editable={!mutation.isPending && !paused}
          multiline
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: COLORS.primary }, (!input.trim() || mutation.isPending || paused) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || mutation.isPending || paused}
          accessibilityRole="button"
          accessibilityLabel="Send"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={20} color={COLORS.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, primary }: { message: Message; primary: string }) {
  const isUser = message.role === 'user';
  const dataSteps = (message.steps ?? []).filter((s) => s.data != null);

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { borderColor: primary + '55', backgroundColor: primary + '18' }]
            : message.error
              ? styles.bubbleError
              : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.bubbleText, message.error && { color: COLORS.error }]}>{message.content}</Text>
      </View>
      {!isUser && dataSteps.map((step, i) => (
        <InsightsToolResultView key={i} tool={step.tool} data={step.data} />
      ))}
    </View>
  );
}

// One trace bubble that grows: every completed line stays (with a check), and the currently
// running line shows a spinner beneath them. "Thinking" is the first line while we wait on the
// model, then stays checked as the real tool steps reveal one by one.
function TraceBubble({ completed, active, primary }: { completed: string[]; active: string | null; primary: string }) {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapAssistant]}>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.trace]}>
        {completed.map((label, i) => (
          <View key={`done-${i}`} style={styles.traceRow}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
            <Text style={[styles.traceText, { color: COLORS.textMuted }]}>{label}</Text>
          </View>
        ))}
        {active !== null && (
          <View style={styles.traceRow}>
            <ActivityIndicator size="small" color={primary} />
            <Text style={[styles.traceText, { color: COLORS.text }, FONT.semibold]}>{active}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState({
  primary,
  onSuggest,
  canAskRevenue,
  disabled,
}: {
  primary: string;
  onSuggest: (q: string) => void;
  canAskRevenue: boolean;
  disabled: boolean;
}) {
  const suggestions = canAskRevenue ? [SUGGESTIONS[0], REVENUE_SUGGESTION, ...SUGGESTIONS.slice(1, 3)] : SUGGESTIONS;
  return (
    <View style={styles.empty}>
      <Ionicons name="sparkles-outline" size={40} color={primary} />
      <Text style={styles.emptyTitle}>Ask your gym anything</Text>
      <Text style={styles.emptySub}>
        {canAskRevenue ? 'Members, attendance, revenue and trends.' : 'Members, attendance and trends. Revenue is for the owner.'}
      </Text>
      <Text style={styles.emptySub}>I can also register, renew or suspend a member. I always ask first.</Text>
      <View style={styles.suggestions}>
        {suggestions.map((q) => (
          <TouchableOpacity key={q} style={styles.suggestion} onPress={() => onSuggest(q)} disabled={disabled} activeOpacity={0.7}>
            <Text style={styles.suggestionText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  usageLine: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },

  listContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl },

  bubbleWrap: { maxWidth: '86%', gap: 4 },
  bubbleWrapUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapAssistant: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleUser: {},
  bubbleAssistant: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  bubbleError: { backgroundColor: COLORS.errorBg, borderColor: COLORS.error },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20, ...FONT.regular },

  trace: { gap: SPACING.sm, minWidth: 200 },
  traceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  traceText: { fontSize: 13, ...FONT.regular },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 20, color: COLORS.text, ...FONT.semibold, marginTop: SPACING.sm },
  emptySub: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular, textAlign: 'center' },
  suggestions: { marginTop: SPACING.lg, gap: SPACING.sm, width: '100%' },
  suggestion: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  suggestionText: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    paddingBottom: 10,
    color: COLORS.text,
    fontSize: 14,
    ...FONT.regular,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
