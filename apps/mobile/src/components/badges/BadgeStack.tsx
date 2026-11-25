import { Pressable, View } from 'react-native';
import type { EquippedBadge } from '../../types';
import { BadgeMedal } from './BadgeMedal';

/** Up to three small, overlapping medals next to a name. Tap to see what they are. */
export function BadgeStack({
  badges,
  size = 18,
  onPress,
}: {
  badges: EquippedBadge[];
  size?: number;
  onPress?: () => void;
}) {
  if (badges.length === 0) return null;
  const medals = (
    <View style={{ flexDirection: 'row' }}>
      {badges.slice(0, 3).map((b, i) => (
        <View key={b.memberBadgeId} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: 3 - i }}>
          <BadgeMedal category={b.category} tier={b.tier} color={b.color} icon={b.icon} size={size} />
        </View>
      ))}
    </View>
  );
  if (!onPress) return medals;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Badges: ${badges.map((b) => b.name).join(', ')}`}
    >
      {medals}
    </Pressable>
  );
}
