import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useInsightsQuery } from '../../hooks/insights';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { InsightsHistoryTurn } from '../../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  error?: boolean;
}

const SUGGESTIONS = [
  'How many active members do we have?',
  'How much revenue this month?',
  'How many check-ins today?',
  'Check-ins per day this week',
];

const TOOL_LABELS: Record<string, string> = {
  find_member: 'members',
  get_member_checkin_status: 'check-in status',
  query_metric: 'metrics',
  get_trend: 'trend data',
};

export default function StaffInsightsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const mutation = useInsightsQuery();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;

    const history: InsightsHistoryTurn[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');

    mutation.mutate(
      { message: trimmed, history },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.answer, toolsUsed: data.toolsUsed },
          ]);
        },
        onError: (err) => {
          const message = (err as { message?: string })?.message ?? 'Something went wrong. Please try again.';
          setMessages((prev) => [...prev, { role: 'assistant', content: message, error: true }]);
        },
      },
    );
  };

  const isEmpty = messages.length === 0 && !mutation.isPending;

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
        <EmptyState primary={theme.primary} onSuggest={send} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <Bubble message={item} primary={theme.primary} />}
          ListFooterComponent={mutation.isPending ? <ThinkingBubble /> : null}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your gym…"
          placeholderTextColor={COLORS.textMuted}
          editable={!mutation.isPending}
          multiline
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || mutation.isPending) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || mutation.isPending}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, primary }: { message: Message; primary: string }) {
  const isUser = message.role === 'user';
  const tools = message.toolsUsed
    ? [...new Set(message.toolsUsed.map((t) => TOOL_LABELS[t] ?? t))]
    : [];

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
      {!isUser && tools.length > 0 && (
        <Text style={styles.toolsText}>✦ Queried {tools.join(', ')}</Text>
      )}
    </View>
  );
}

function ThinkingBubble() {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapAssistant]}>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.thinking]}>
        <ActivityIndicator size="small" color={COLORS.textMuted} />
        <Text style={styles.thinkingText}>Thinking…</Text>
      </View>
    </View>
  );
}

function EmptyState({ primary, onSuggest }: { primary: string; onSuggest: (q: string) => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="sparkles-outline" size={40} color={primary} />
      <Text style={styles.emptyTitle}>Ask your gym anything</Text>
      <Text style={styles.emptySub}>Members, attendance, revenue, and trends.</Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((q) => (
          <TouchableOpacity key={q} style={styles.suggestion} onPress={() => onSuggest(q)} activeOpacity={0.7}>
            <Text style={styles.suggestionText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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
  toolsText: { fontSize: 11, color: COLORS.textMuted, paddingHorizontal: 4 },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  thinkingText: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular },

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
    borderRadius: RADIUS.lg,
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
