import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT, GRADIENTS, RADIUS } from '../../constants/theme';

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Leaderboard</Text>

      <View style={styles.card}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name="trophy" size={36} color="#000" />
        </LinearGradient>

        <Text style={styles.heading}>Coming Soon</Text>
        <Text style={styles.sub}>
          See where you rank among your gym community — top check-ins, streaks, and more.
        </Text>

        <View style={styles.previewRow}>
          {['🥇', '🥈', '🥉'].map((medal, i) => (
            <View key={i} style={styles.previewChip}>
              <Text style={styles.previewMedal}>{medal}</Text>
              <View style={styles.previewBar}>
                <View style={[styles.previewFill, { width: `${90 - i * 20}%` as any }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  pageTitle: {
    fontSize: 24,
    ...FONT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  heading: {
    fontSize: 22,
    ...FONT.bold,
    color: COLORS.text,
  },
  sub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  previewRow: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    opacity: 0.45,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewMedal: { fontSize: 20, width: 28 },
  previewBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  previewFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
});
