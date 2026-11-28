import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { CoachMascot } from '../onboarding/CoachMascot';

/** Shown when the member has no plan yet (skipped setup, or reached their goal). */
export function SetupPlanCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
        pressed && { opacity: 0.9 },
      ]}
    >
      <CoachMascot size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="h3" style={{ color: theme.colors.text }}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.accentText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
});
