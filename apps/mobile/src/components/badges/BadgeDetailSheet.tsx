import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useEquipBadge } from '../../hooks/badges';
import { Notice, PrimaryButton, TextButton } from '../onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import type { CollectionBadge } from '../../types';
import { BadgeMedal } from './BadgeMedal';
import { CATEGORY_LABEL, RARITY_LABEL, TIER_LABEL } from './badge-labels';
import { Sheet } from '../ui';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Everything about one badge from the member's collection, with equip / unequip. */
export function BadgeDetailSheet({ badge, onClose }: { badge: CollectionBadge | null; onClose: () => void }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const equip = useEquipBadge();
  const { reset } = equip;
  const badgeKey = badge?.key;
  useEffect(() => reset(), [badgeKey, reset]);

  const earned = badge?.earned ?? null;
  const canEquip = earned !== null && !earned.expired;

  return (
    <Sheet visible={badge !== null} onClose={onClose}>
      {badge && (
        <>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <BadgeMedal category={badge.category} tier={badge.tier} color={badge.color} icon={badge.icon} size={96} locked={!earned} rarity={earned?.expired ? null : badge.rarity} />
            <Text variant="caption" style={{ color: C.textMuted, letterSpacing: 0.8 }}>
              {CATEGORY_LABEL[badge.category].toUpperCase()}
              {badge.tier ? ` · ${TIER_LABEL[badge.tier].toUpperCase()}` : ''}
            </Text>
            <Text variant="h2" style={{ color: C.text, textAlign: 'center' }}>
              {badge.name}
            </Text>
            {badge.description ? (
              <Text variant="body" style={{ color: C.textSecondary, textAlign: 'center' }}>
                {badge.description}
              </Text>
            ) : null}
          </View>

          {!earned && badge.progress && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label" style={{ color: C.textSecondary }}>
                  Your progress
                </Text>
                <Text variant="label" style={{ color: C.text, fontFamily: 'Inter_600SemiBold' }}>
                  {badge.progress.current} / {badge.progress.target} {badge.progress.unit}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (badge.progress.current / Math.max(1, badge.progress.target)) * 100)}%`,
                    backgroundColor: theme.primary,
                  }}
                />
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Fact label={earned ? 'Earned' : 'Status'} value={earned ? formatDate(earned.awardedAt) : 'Not yet earned'} />
            <Fact
              label="Rarity"
              value={[badge.rarity && RARITY_LABEL[badge.rarity], badge.rarityPct === null ? null : `${badge.rarityPct}% of members`]
                .filter(Boolean)
                .join(' · ') || '—'}
            />
          </View>
          {badge.timesEarned > 1 && (
            <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
              Earned {badge.timesEarned} times
            </Text>
          )}
          {earned?.expired && <Notice tone="info">This badge has expired. Win it again on the leaderboard.</Notice>}
          {equip.error && <Notice tone="error">{formatApiError(equip.error, 'Could not update this badge.')}</Notice>}

          {canEquip && !earned.isEquipped && (
            <PrimaryButton
              label={`Equip in ${CATEGORY_LABEL[badge.category]}`}
              loading={equip.isPending}
              onPress={() => equip.mutate({ badgeId: earned.memberBadgeId, equipped: true }, { onSuccess: onClose })}
            />
          )}
          {earned?.isEquipped && (
            <TextButton
              label="Unequip"
              disabled={equip.isPending}
              onPress={() => equip.mutate({ badgeId: earned.memberBadgeId, equipped: false }, { onSuccess: onClose })}
            />
          )}
        </>
      )}
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 10, gap: 2 }}>
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text variant="label" style={{ color: theme.colors.text, fontFamily: 'Inter_600SemiBold' }}>
        {value}
      </Text>
    </View>
  );
}
