import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { AppLoader } from '../../components/AppLoader';
import { chatService } from '../../services/chat.service';
import { getAccessToken } from '../../services/api';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import { useToast } from '../../components/ui';
import { formatApiError } from '../../lib/format-error';
import { useEquippedBadgesMap } from '../../hooks/badges';
import { BadgeStack } from '../../components/badges/BadgeStack';
import { EquippedBadgesSheet } from '../../components/badges/EquippedBadgesSheet';
import type { ChatMessage, EquippedBadge } from '../../types';

const WS_BASE_URL = (() => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:9001/api/v1';
  try { return new URL(apiUrl).origin; } catch { return 'http://localhost:9001'; }
})();

function MessageBubble({
  msg,
  currentUserId,
  senderBadges,
  onBadgesPress,
  onDelete,
}: {
  msg: ChatMessage;
  currentUserId: string;
  senderBadges: EquippedBadge[];
  onBadgesPress: () => void;
  onDelete: (msg: ChatMessage) => void;
}) {
  const isMine = msg.sender.id === currentUserId;
  const time = new Date(msg.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (msg.isDeleted) {
    return (
      <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
        <View style={[styles.bubble, styles.bubbleDeleted]}>
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
      <View style={[styles.senderRow, isMine && styles.senderRowMine]}>
        {!isMine && <Text style={styles.senderName}>{msg.sender.fullName}</Text>}
        <BadgeStack badges={senderBadges} size={16} onPress={onBadgesPress} />
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onDelete(msg)}
        style={[styles.bubble, isMine ? [styles.bubbleMine, { backgroundColor: COLORS.primary }] : styles.bubbleTheirs]}
      >
        <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{msg.content}</Text>
        <Text style={[styles.timeText, isMine && styles.timeTextMine]}>{time}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function StaffChatScreen() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const equippedBadgesQ = useEquippedBadgesMap();
  const [badgeOwner, setBadgeOwner] = useState<{ name: string; badges: EquippedBadge[] } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function setup() {
      try {
        const conv = await chatService.getDefaultConversation(user!.gymId);
        if (!mounted) return;
        conversationIdRef.current = conv.id;

        const msgs = await chatService.getMessages(user!.gymId, conv.id, 50);
        if (!mounted) return;
        setMessages([...msgs].reverse());

        const token = await getAccessToken();
        if (!mounted) return;

        const socket = io(`${WS_BASE_URL}/chat`, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (!mounted) { socket.disconnect(); return; }
          setIsConnected(true);
          setError(null);
          socket.emit('join', { conversationId: conv.id });
        });
        socket.on('disconnect', () => { if (mounted) setIsConnected(false); });
        socket.on('connect_error', (err) => {
          if (mounted) { setIsConnected(false); setError(`Connection failed: ${err.message}`); }
        });
        socket.on('message.new', (msg: ChatMessage) => {
          if (!mounted) return;
          setMessages((prev) => [...prev, msg]);
          listRef.current?.scrollToEnd({ animated: true });
        });
        socket.on('message.deleted', ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: null } : m)),
          );
        });
      } catch (err: unknown) {
        if (mounted) setError((err as { message?: string })?.message ?? 'Could not load chat');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    setup();
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      conversationIdRef.current = null;
    };
  }, [user?.id]);

  const sendMessage = () => {
    const content = input.trim();
    const convId = conversationIdRef.current;
    const socket = socketRef.current;
    if (!content || !convId || !socket?.connected) return;
    setInput('');
    socket.emit('message.send', { conversationId: convId, content }, (ack: { error?: string }) => {
      if (ack?.error) setInput(content);
    });
  };

  const confirmDelete = (msg: ChatMessage) => {
    if (msg.isDeleted) return;
    Alert.alert('Delete message', `Remove this message from ${msg.sender.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const convId = conversationIdRef.current;
          if (!user || !convId) return;
          try {
            await chatService.deleteMessage(user.gymId, convId, msg.id);
            toast.show('Message deleted');
          } catch (err: unknown) {
            toast.show(formatApiError(err, 'Failed to delete message'), { tone: 'error' });
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.screenTitle}>Community Chat</Text>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? COLORS.success : COLORS.textMuted }]} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <AppLoader />
        </View>
      ) : error && messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              currentUserId={user?.id ?? ''}
              senderBadges={equippedBadgesQ.data?.get(item.sender.id) ?? []}
              onBadgesPress={() =>
                setBadgeOwner({ name: item.sender.fullName, badges: equippedBadgesQ.data?.get(item.sender.id) ?? [] })
              }
              onDelete={confirmDelete}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={<Text style={styles.hint}>Long-press a message to delete it.</Text>}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={COLORS.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: COLORS.primary }, (!input.trim() || !isConnected) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || !isConnected}
        >
          <Ionicons name="arrow-up" size={20} color={COLORS.onPrimary} />
        </TouchableOpacity>
      </View>

      <EquippedBadgesSheet
        ownerName={badgeOwner?.name ?? null}
        badges={badgeOwner?.badges ?? []}
        onClose={() => setBadgeOwner(null)}
      />
    </KeyboardAvoidingView>
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
  // 44pt tap target; pulled left so the arrow lines up with the content edge.
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: -6 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  screenTitle: { fontSize: 22, color: COLORS.text, ...FONT.bold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.sm },
  hint: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular, textAlign: 'center', marginBottom: SPACING.sm },

  bubbleWrap: { maxWidth: '82%', alignSelf: 'flex-start', gap: 2 },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.sm },
  senderRowMine: { justifyContent: 'flex-end' },
  senderName: { fontSize: 12, color: COLORS.textMuted, ...FONT.medium },
  bubble: { borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleMine: {},
  bubbleDeleted: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, opacity: 0.6 },
  messageText: { fontSize: 14, color: COLORS.text, ...FONT.regular },
  messageTextMine: { color: COLORS.onPrimary },
  timeText: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  timeTextMine: { color: COLORS.onPrimary + '99' },
  deletedText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },

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
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    ...FONT.regular,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
