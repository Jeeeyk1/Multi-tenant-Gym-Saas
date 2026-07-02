import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS, FONT } from '../../constants/theme';

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
  const C = theme.colors;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    pageTitle: { fontSize: 28, color: C.text, ...FONT.bold, marginBottom: SPACING.xs },
    pageSub: { fontSize: 14, color: C.textSecondary, ...FONT.regular, marginBottom: SPACING.xl },
    list: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: 18,
    },
    cardBorder: { borderTopWidth: 1, borderTopColor: C.border },
    iconBubble: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardText: { flex: 1 },
    cardLabel: { fontSize: 15, color: C.text, ...FONT.semibold, marginBottom: 3 },
    cardDescription: { fontSize: 13, color: C.textSecondary, ...FONT.regular },
  }), [C]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>Community</Text>
      <Text style={s.pageSub}>Stay connected with your gym</Text>

      <View style={s.list}>
        {HUB_ITEMS.map((item, idx) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              s.card,
              idx > 0 && s.cardBorder,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => router.push(item.route as never)}
          >
            <View style={[s.iconBubble, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
