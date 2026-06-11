import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { chatService } from '../../services/chat.service';
import { getAccessToken } from '../../services/api';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { ChatMessage } from '../../types';

// Socket.io connects to the server root — strip the /api/v1 REST prefix.
const WS_BASE_URL = (() => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  try { return new URL(apiUrl).origin; } catch { return 'http://localhost:3000'; }
})();

function MessageBubble({ msg, currentUserId }: { msg: ChatMessage; currentUserId: string }) {
  const { theme } = useTheme();
  const isMine = msg.sender.id === currentUserId;
  const time = new Date(msg.sentAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (msg.isDeleted) {
    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, isMine && { backgroundColor: theme.primary }]}>
        <Text style={styles.deletedText}>This message was deleted</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
      {!isMine && <Text style={styles.senderName}>{msg.sender.fullName}</Text>}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, isMine && { backgroundColor: theme.primary }]}>
        {msg.replyTo && !msg.replyTo.isDeleted && (
          <View style={[styles.replyBanner, { borderLeftColor: theme.primary + '99' }]}>
            <Text style={styles.replyText} numberOfLines={1}>
              ↩ {msg.replyTo.content}
            </Text>
          </View>
        )}
        <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
          {msg.content}
        </Text>
        <Text style={[styles.timeText, isMine && styles.timeTextMine]}>{time}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Load conversation + messages, then connect socket
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    async function setup() {
      try {
        // 1. Discover default community conversation
        const conv = await chatService.getDefaultConversation(user!.gymId);
        if (!mounted) return;
        conversationIdRef.current = conv.id;

        // 2. Load message history (newest-first from API, reverse for display)
        const msgs = await chatService.getMessages(user!.gymId, conv.id, 50);
        if (!mounted) return;
        setMessages([...msgs].reverse());

        // 3. Connect WebSocket
        const token = await getAccessToken();
        if (!mounted) return;

        const socket = io(`${WS_BASE_URL}/chat`, {
          auth: { token },
          transports: ['websocket'],
        });
        socketRef.current = socket;

        console.log('[Chat] Connecting to', `${WS_BASE_URL}/chat`, 'token present:', !!token);

        socket.on('connect', () => {
          console.log('[Chat] Connected! socket.id=', socket.id);
          if (!mounted) { socket.disconnect(); return; }
          setIsConnected(true);
          setError(null);
          socket.emit('join', { conversationId: conv.id }, (ack: { ok?: boolean; error?: string }) => {
            console.log('[Chat] join ack:', ack);
            if (ack?.ok) {
              socket.emit('conversation.read', { conversationId: conv.id });
            }
          });
        });

        socket.on('disconnect', (reason) => {
          console.log('[Chat] Disconnected, reason:', reason);
          if (mounted) setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.warn('[Chat] connect_error:', err.message, err);
          if (mounted) {
            setIsConnected(false);
            setError(`Connection failed: ${err.message}`);
          }
        });

        socket.on('error', (payload: { code: string; message: string }) => {
          console.warn('[Chat] server error event:', payload);
          if (mounted) setError(payload.message);
        });

        socket.on('message.new', (msg: ChatMessage) => {
          if (!mounted) return;
          setMessages((prev) => [...prev, msg]);
          flatListRef.current?.scrollToEnd({ animated: true });
        });

        socket.on('message.deleted', ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, isDeleted: true, content: null } : m,
            ),
          );
        });

        socket.on(
          'message.reaction',
          ({
            messageId,
            userId,
            action,
            emoji,
          }: {
            messageId: string;
            userId: string;
            action: 'add' | 'remove';
            emoji: string;
          }) => {
            if (!mounted) return;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== messageId) return m;
                const reactions =
                  action === 'add'
                    ? [...m.reactions, { emoji, userId }]
                    : m.reactions.filter(
                        (r) => !(r.emoji === emoji && r.userId === userId),
                      );
                return { ...m, reactions };
              }),
            );
          },
        );
      } catch (err: unknown) {
        if (!mounted) return;
        const e = err as { message?: string };
        setError(e?.message ?? 'Could not load chat');
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
    console.log('[Chat] sendMessage called — content:', !!content, 'convId:', convId, 'connected:', socket?.connected);
    if (!content || !convId || !socket?.connected) return;

    setInput('');
    socket.emit(
      'message.send',
      { conversationId: convId, content },
      (ack: { ok?: boolean; message?: ChatMessage; error?: string }) => {
        console.log('[Chat] message.send ack:', ack);
        if (ack?.error) {
          setInput(content); // restore input on failure
        }
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Chat</Text>
        <Text style={[styles.headerStatus, isConnected ? styles.online : styles.offline]}>
          {isConnected ? '● Online' : '○ Connecting…'}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble msg={item} currentUserId={user?.id ?? ''} />
        )}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              No messages yet. Be the first to say hi!
            </Text>
          </View>
        }
      />

      {error && messages.length > 0 && (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Message the community…"
          placeholderTextColor={COLORS.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || !isConnected) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || !isConnected}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: 18, ...FONT.semibold, color: COLORS.text },
  headerStatus: { fontSize: 11, marginTop: 2, ...FONT.regular },
  online: { color: COLORS.success },
  offline: { color: COLORS.textMuted },
  messageList: { padding: SPACING.md, gap: SPACING.sm, flexGrow: 1 },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xxl,
  },
  emptyChatText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: SPACING.sm },
  bubbleWrapMine: { alignItems: 'flex-end' },
  senderName: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
  },
  bubbleMine: { backgroundColor: COLORS.primary },
  bubbleTheirs: { backgroundColor: COLORS.card },
  messageText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  messageTextMine: { color: '#000' },
  timeText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' },
  timeTextMine: { color: 'rgba(255,255,255,0.6)' },
  deletedText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  replyBanner: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primaryLight,
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  replyText: { fontSize: 11, color: COLORS.textSecondary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  inputField: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 18, color: '#000', ...FONT.bold },
  inlineError: {
    backgroundColor: COLORS.errorBg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.error,
  },
  inlineErrorText: { color: COLORS.error, fontSize: 12, textAlign: 'center' },
});
