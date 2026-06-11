import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { announcementService } from '../../services/announcement.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { Announcement } from '../../types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await announcementService.list(user.gymId);
      setAnnouncements(data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openAnnouncement = async (item: Announcement) => {
    setSelected(item);
    if (!item.readAt && user) {
      announcementService.markRead(user.gymId, item.id).catch(() => {});
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, readAt: new Date().toISOString() } : a)),
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const pinned = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>News</Text>

        <TouchableOpacity
          style={[styles.chatBanner, { borderColor: theme.primary + '40' }]}
          onPress={() => router.push('/(member)/chat')}
          activeOpacity={0.75}
        >
          <Ionicons name="chatbubbles" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chatBannerTitle}>Community Chat</Text>
            <Text style={styles.chatBannerSub}>Talk with your gym community</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {announcements.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No announcements yet.</Text>
          </View>
        )}

        {pinned.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>📌 Pinned</Text>
            {pinned.map((a) => <AnnouncementRow key={a.id} item={a} onPress={openAnnouncement} />)}
          </>
        )}

        {regular.length > 0 && (
          <>
            {pinned.length > 0 && <Text style={styles.sectionLabel}>Latest</Text>}
            {regular.map((a) => <AnnouncementRow key={a.id} item={a} onPress={openAnnouncement} />)}
          </>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selected.title}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalMeta}>
              By {selected.createdByUser.fullName} · {timeAgo(selected.publishAt)}
            </Text>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalContent}>{selected.content}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function AnnouncementRow({ item, onPress }: { item: Announcement; onPress: (a: Announcement) => void }) {
  const { theme } = useTheme();
  const isUnread = !item.readAt;
  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread, isUnread && { borderColor: theme.primary + '66' }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, isUnread && styles.rowTitleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowPreview} numberOfLines={2}>{item.content}</Text>
        </View>
      </View>
      <Text style={styles.rowTime}>{timeAgo(item.publishAt)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  pageTitle: { fontSize: 24, ...FONT.bold, color: COLORS.text, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 12, ...FONT.semibold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  chatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  chatBannerTitle: { fontSize: 14, ...FONT.semibold, color: COLORS.text },
  chatBannerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  rowUnread: { borderColor: COLORS.primary + '66' },
  rowLeft: { flex: 1, flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5 },
  rowTitle: { fontSize: 14, color: COLORS.text, ...FONT.regular, marginBottom: 3 },
  rowTitleBold: { ...FONT.semibold },
  rowPreview: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  rowTime: { fontSize: 11, color: COLORS.textMuted, flexShrink: 0 },
  modal: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: SPACING.lg, marginBottom: SPACING.sm, gap: SPACING.md },
  modalTitle: { flex: 1, fontSize: 22, ...FONT.bold, color: COLORS.text },
  closeBtn: { padding: SPACING.xs },
  closeText: { fontSize: 18, color: COLORS.textSecondary },
  modalMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.lg },
  modalBody: { flex: 1 },
  modalContent: { fontSize: 15, color: COLORS.text, lineHeight: 24, ...FONT.regular },
});
