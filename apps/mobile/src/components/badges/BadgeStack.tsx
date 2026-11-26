import { Pressable, View } from 'react-native';
import { BadgeRarity } from '../../constants/enums';
import type { EquippedBadge } from '../../types';
import { BadgeMedal } from './BadgeMedal';
import { LegendaryFlame } from './LegendaryFlame';

/**
 * Up to three small, overlapping medals next to a name, plus a flame when one is legendary
 * (so everyone in chat can see it). Tap to see what they are.
 */
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
  const legendary = badges.some((b) => b.rarity === BadgeRarity.LEGENDARY);
  const medals = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {badges.slice(0, 3).map((b, i) => (
        <View key={b.memberBadgeId} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: 3 - i }}>
          <BadgeMedal category={b.category} tier={b.tier} color={b.color} icon={b.icon} size={size} rarity={b.rarity} />
        </View>
      ))}
      {legendary && (
        <View style={{ marginLeft: size * 0.15 }}>
          <LegendaryFlame size={Math.round(size * 0.85)} />
        </View>
      )}
    </View>
  );
  if (!onPress) return medals;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Badges: ${badges.map((b) => (b.rarity === BadgeRarity.LEGENDARY ? `${b.name} (legendary)` : b.name)).join(', ')}`}
    >
      {medals}
    </Pressable>
  );
}
