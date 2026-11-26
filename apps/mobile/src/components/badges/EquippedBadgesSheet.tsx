import { View } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import type { EquippedBadge } from '../../types';
import { BadgeMedal } from './BadgeMedal';
import { CATEGORY_LABEL } from './badge-labels';
import { Sheet } from './Sheet';

/** What someone's equipped badges mean — opened from chat, leaderboard or Who's Here. */
export function EquippedBadgesSheet({
  ownerName,
  badges,
  onClose,
}: {
  ownerName: string | null;
  badges: EquippedBadge[];
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <Sheet visible={ownerName !== null} onClose={onClose}>
      <Text variant="h2" style={{ color: C.text }}>
        {ownerName}&apos;s badges
      </Text>
      {badges.map((b) => (
        <View key={b.memberBadgeId} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <BadgeMedal category={b.category} tier={b.tier} color={b.color} icon={b.icon} size={52} rarity={b.rarity} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" style={{ color: C.textMuted, letterSpacing: 0.8 }}>
              {CATEGORY_LABEL[b.category].toUpperCase()}
            </Text>
            <Text variant="bodyMed" style={{ color: C.text }}>
              {b.name}
            </Text>
            {b.description ? (
              <Text variant="caption" style={{ color: C.textSecondary }}>
                {b.description}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Sheet>
  );
}
