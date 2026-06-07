import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT, GRADIENTS, RADIUS } from '../../constants/theme';

const UPCOMING_FEATURES = [
  {
    icon: 'barbell-outline' as const,
    label: 'AI Workout Plans',
    desc: 'Personalised training programs based on your goals',
  },
  {
    icon: 'nutrition-outline' as const,
    label: 'Nutrition Coaching',
    desc: 'Smart meal suggestions to complement your training',
  },
  {
    icon: 'trending-up-outline' as const,
    label: 'Progress Insights',
    desc: 'AI-powered analysis of your check-in patterns and streaks',
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    label: 'AI Fitness Coach',
    desc: 'Ask anything — your 24/7 virtual gym coach',
  },
];

export default function AIScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>AI Features</Text>

      <View style={styles.heroBadge}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name="flash" size={36} color="#000" />
        </LinearGradient>
        <Text style={styles.heroHeading}>Coming Soon</Text>
        <Text style={styles.heroSub}>
          We're building intelligent tools to supercharge your fitness journey.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>What's coming</Text>

      {UPCOMING_FEATURES.map((f) => (
        <View key={f.label} style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name={f.icon} size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureLabel}>{f.label}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        </View>
      ))}
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
  heroBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  heroHeading: {
    fontSize: 22,
    ...FONT.bold,
    color: COLORS.text,
  },
  heroSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  sectionLabel: {
    fontSize: 12,
    ...FONT.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 14,
    ...FONT.semibold,
    color: COLORS.text,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
