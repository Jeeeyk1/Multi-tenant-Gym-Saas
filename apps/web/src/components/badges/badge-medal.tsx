import { BadgeCategory, BadgeRarity, type BadgeTier } from '@gym-saas/contracts';
import {
  barbell, calendar, diamond, flame, flash, footsteps, grid, heart, lockClosed, medal, moon,
  ribbon, rocket, shieldCheckmark, star, sunny, trophy,
} from 'ionicons/icons';

// Same icon set as the mobile app, so a badge looks identical on both.
const ICONS: Record<string, string> = {
  barbell, calendar, diamond, flame, flash, footsteps, grid, heart, medal, moon,
  ribbon, rocket, 'shield-checkmark': shieldCheckmark, star, sunny, trophy,
};

const RIM: Record<BadgeTier | 'IRON' | 'LOCKED', string> = {
  GOLD: '#D8A632',
  SILVER: '#AEB5BF',
  BRONZE: '#B8743F',
  IRON: '#3C4049',
  LOCKED: '#4A4D57',
};
const LOCKED_FACE = '#2B2D35';
// Rarity effects: warm flames for legendary, a violet glow for epic.
const FLAME_CORE = '#FFB020';
const FLAME_EDGE = '#FF5A1F';
const EPIC_GLOW = '#A78BFA';
// Below this size (chat, leaderboard rows) rare badges get a still glow; flames would be noise.
const ANIMATE_MIN_SIZE = 40;
const FLAME_ANGLES = [-62, -31, 0, 31, 62];
const LOCKED_GLYPH = '#7C7F8A';
const GLYPH = '#FFFFFF';

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

/**
 * A badge drawn as a gym plate: its shape shows the category, its rim the tier, and
 * the centre the badge's own icon and colour. Locked badges are greyed out.
 */
export function BadgeMedal({
  category,
  tier,
  color,
  icon,
  size = 32,
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
  const rim = locked ? RIM.LOCKED : RIM[tier ?? 'IRON'];
  const face = locked ? LOCKED_FACE : color;
  const glyph = locked ? lockClosed : ICONS[icon] ?? ribbon;
  const glyphSize = size * (locked ? 0.3 : 0.36);
  // The shield's face sits higher than the plate's and hex's.
  const glyphOffset = category === BadgeCategory.LOYALTY ? -size * 0.04 : 0;
  const mask = `url("${glyph}") center / contain no-repeat`;

  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {rarity && !locked && <RarityAura rarity={rarity} size={size} />}
      <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0">
        {category === BadgeCategory.CONSISTENCY ? (
          <>
            <circle cx={50} cy={50} r={46} fill={rim} />
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={48.5} y={5} width={3} height={6} rx={1} fill="rgba(0,0,0,0.28)" transform={`rotate(${i * 45} 50 50)`} />
            ))}
            <circle cx={50} cy={50} r={34} fill={face} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          </>
        ) : (
          <>
            <path d={OUTER[category]} fill={rim} />
            <path d={INNER[category]} fill={face} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          </>
        )}
      </svg>
      <span
        className="relative"
        style={{
          width: glyphSize,
          height: glyphSize,
          transform: `translateY(${glyphOffset}px)`,
          backgroundColor: locked ? LOCKED_GLYPH : GLYPH,
          mask,
          WebkitMask: mask,
        }}
      />
    </span>
  );
}

function RarityAura({ rarity, size }: { rarity: BadgeRarity; size: number }) {
  const legendary = rarity === BadgeRarity.LEGENDARY;
  const animated = size >= ANIMATE_MIN_SIZE;
  const glow = legendary ? FLAME_EDGE : EPIC_GLOW;
  const flameSize = size * 0.34;
  const radius = size * 0.52;
  const flameMask = `url("${flame}") center / contain no-repeat`;
  return (
    <span className="pointer-events-none absolute inset-0">
      <span
        className={animated ? 'badge-aura-pulse' : undefined}
        style={{
          position: 'absolute',
          inset: -size * 0.18,
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          opacity: 0.45,
        }}
      />
      {legendary &&
        animated &&
        FLAME_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <span
              key={deg}
              style={{
                position: 'absolute',
                left: size / 2 + Math.sin(rad) * radius - flameSize / 2,
                top: size / 2 - Math.cos(rad) * radius - flameSize * 0.75,
                width: flameSize,
                height: flameSize,
                transform: `rotate(${deg}deg)`,
              }}
            >
              <span
                className="badge-flame"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  backgroundColor: i % 2 ? FLAME_CORE : FLAME_EDGE,
                  mask: flameMask,
                  WebkitMask: flameMask,
                  animationDelay: `${i * 90}ms`,
                  animationDuration: `${700 + i * 70}ms`,
                }}
              />
            </span>
          );
        })}
    </span>
  );
}
