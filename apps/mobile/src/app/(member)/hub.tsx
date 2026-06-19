import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface HubItem {
  icon: IoniconsName;
  label: string;
  description: string;
  route: string;
  color: string;
}

const HUB_ITEMS: HubItem[] = [
  {
    icon: 'megaphone-outline',
    label: 'Announcements',
    description: 'Gym news, updates & pinned posts',
    route: '/(member)/announcements',
    color: '#F59E0B',
  },
  {
    icon: 'chatbubbles-outline',
    label: 'Community Chat',
    description: 'Talk with other members',
    route: '/(member)/chat',
    color: '#0891B2',
  },
  {
    icon: 'trophy-outline',
    label: 'Leaderboard',
    description: 'See the top lifters in your gym',
    route: '/(member)/leaderboard',
    color: '#8B5CF6',
  },
];

export default function HubScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Community</Text>
      <Text style={styles.pageSub}>Stay connected with your gym</Text>

      <View style={styles.list}>
        {HUB_ITEMS.map((item, idx) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.card,
              idx > 0 && styles.cardBorder,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => router.push(item.route as never)}
          >
            <View style={[styles.iconBubble, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  pageTitle: { fontSize: 28, color: COLORS.text, ...FONT.bold, marginBottom: SPACING.xs },
  pageSub: { fontSize: 14, color: COLORS.textSecondary, ...FONT.regular, marginBottom: SPACING.xl },

  list: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 18,
  },
  cardBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, color: COLORS.text, ...FONT.semibold, marginBottom: 3 },
  cardDescription: { fontSize: 13, color: COLORS.textSecondary, ...FONT.regular },
});
