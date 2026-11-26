import type { ComponentProps } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { BadgeCategory, BadgeRarity, type BadgeTier } from '../../constants/enums';
import { BADGE_COLORS } from '../../constants/theme';
import { ANIMATE_MIN_SIZE, RarityAura } from './RarityAura';

type IconName = ComponentProps<typeof Ionicons>['name'];

// How far legendary flames reach above the medal, as a share of its size (see RarityAura).
const FLAME_HEADROOM = 0.3;


// Category shapes on a 100×100 grid: Consistency = weight plate, Loyalty = shield,
// Strength = hex plate.
const OUTER: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: '',
  [BadgeCategory.LOYALTY]: 'M50 4l40 13v28c0 25-17 42-40 51C27 87 10 70 10 45V17z',
  [BadgeCategory.STRENGTH]: 'M50 4l40 23v46L50 96 10 73V27z',
};
const INNER: Record<BadgeCategory, string> = {
  [BadgeCategory.CONSISTENCY]: '',
  [BadgeCategory.LOYALTY]: 'M50 16l29 9.5v20c0 18-12 30.5-29 37.5C33 76 21 63.5 21 45.5v-20z',
  [BadgeCategory.STRENGTH]: 'M50 17l29 16.5v33L50 83 21 66.5v-33z',
};

function isIonicon(name: string): name is IconName {
  return name in Ionicons.glyphMap;
}

/**
 * A badge drawn as a gym plate: its shape shows the category, its rim the tier, and
 * the centre the badge's own icon and colour. Locked badges are greyed out.
 */
export function BadgeMedal({
  category,
  tier,
  color,
  icon,
  size = 48,
  locked = false,
  rarity = null,
}: {
  category: BadgeCategory;
  tier: BadgeTier | null;
  color: string;
  icon: string;
  size?: number;
  locked?: boolean;
  /** Rare badges glow; legendary ones burn. Never shown while locked. */
  rarity?: BadgeRarity | null;
}) {
  const rim = locked ? BADGE_COLORS.LOCKED : BADGE_COLORS[tier ?? 'IRON'];
  const face = locked ? BADGE_COLORS.LOCKED_FACE : color;
  const glyph: IconName = isIonicon(icon) ? icon : 'ribbon';
  // The shield's face sits higher than the plate's and hex's.
  const glyphOffset = category === BadgeCategory.LOYALTY ? -size * 0.04 : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        // Legendary flames rise above the medal; keep them off the label or edge above.
        marginTop: rarity === BadgeRarity.LEGENDARY && !locked && size >= ANIMATE_MIN_SIZE ? size * FLAME_HEADROOM : 0,
      }}
      accessible={false}
    >
      {rarity && !locked && <RarityAura rarity={rarity} size={size} />}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        {category === BadgeCategory.CONSISTENCY ? (
          <>
            <Circle cx={50} cy={50} r={46} fill={rim} />
            {Array.from({ length: 8 }, (_, i) => (
              <Rect key={i} x={48.5} y={5} width={3} height={6} rx={1} fill="rgba(0,0,0,0.28)" rotation={i * 45} origin="50, 50" />
            ))}
            <Circle cx={50} cy={50} r={34} fill={face} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          </>
        ) : (
          <>
            <Path d={OUTER[category]} fill={rim} />
            <Path d={INNER[category]} fill={face} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          </>
        )}
      </Svg>
      <Ionicons
        name={locked ? 'lock-closed' : glyph}
        size={size * (locked ? 0.3 : 0.36)}
        color={locked ? BADGE_COLORS.LOCKED_GLYPH : BADGE_COLORS.GLYPH}
        style={{ transform: [{ translateY: glyphOffset }] }}
      />
    </View>
  );
}
