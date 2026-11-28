import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useEquipBadge, useMarkBadgesSeen, useMyBadges } from '../../hooks/badges';
import { Notice, PrimaryButton, TextButton } from '../onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import { useReduceMotion } from '../onboarding/use-reduce-motion';
import { BadgeMedal } from './BadgeMedal';
import { CATEGORY_LABEL, RARITY_LABEL, TIER_LABEL, memberBadgeView } from './badge-labels';

const STAMP_FROM_SCALE = 1.8;
const STAMP_FROM_ROTATION = '-12deg';
// The API accepts at most this many ids per call; any rest show next time.
const MAX_MARK_SEEN = 50;

/**
 * "New badge!" — shown once for badges the member hasn't seen yet, newest first.
 * Closing it (Equip or Later) marks every unseen badge as seen.
 */
export function NewBadgeCelebration() {
  const { theme } = useTheme();
  const C = theme.colors;
  const reduceMotion = useReduceMotion();
  const badgesQ = useMyBadges();
  const markSeen = useMarkBadgesSeen();
  const equip = useEquipBadge();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // Tabs stay mounted, so only celebrate while the dashboard is on screen; this keeps it
  // from opening over another screen's sheet when badges refetch.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const unseen = useMemo(() => {
    const now = new Date();
    return (badgesQ.data ?? [])
      .filter((b) => b.seenAt === null && !dismissed.has(b.id))
      .filter((b) => !(b.expiresAt && new Date(b.expiresAt) < now))
      .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
  }, [badgesQ.data, dismissed]);

  const badge = focused ? unseen[0] : undefined;
  const view = badge ? memberBadgeView(badge) : null;
  const slotHolder = badge
    ? (badgesQ.data ?? []).find((b) => b.isEquipped && b.category === badge.category && b.id !== badge.id)
    : undefined;

  const stamp = useRef(new Animated.Value(0)).current;
  const badgeId = badge?.id;
  const badgeName = view?.name;
  useEffect(() => {
    if (!badgeId) return;
    AccessibilityInfo.announceForAccessibility(`New badge: ${badgeName}`);
    if (reduceMotion) {
      stamp.setValue(1);
      return;
    }
    stamp.setValue(0);
    Animated.spring(stamp, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [badgeId, badgeName, reduceMotion, stamp]);

  function close() {
    const ids = unseen.map((b) => b.id);
    setDismissed((prev) => new Set([...prev, ...ids]));
    markSeen.mutate(ids.slice(0, MAX_MARK_SEEN));
  }

  function equipAndClose() {
    if (!badge) return;
    equip.mutate({ badgeId: badge.id, equipped: true }, { onSuccess: close });
  }

  if (!badge || !view) return null;

  const scale = stamp.interpolate({ inputRange: [0, 1], outputRange: [STAMP_FROM_SCALE, 1] });
  const rotate = stamp.interpolate({ inputRange: [0, 1], outputRange: [STAMP_FROM_ROTATION, '0deg'] });
  // Fades in over the first 40% of the stamp. (No `easing` here: the native driver rejects it.)
  const opacity = stamp.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const more = unseen.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.background }]} accessibilityViewIsModal>
          <Text variant="label" style={{ color: theme.accentText, letterSpacing: 1.2 }}>
            {view.rarity ? `NEW ${RARITY_LABEL[view.rarity].toUpperCase()} BADGE` : 'NEW BADGE'}
          </Text>
          <Animated.View style={{ opacity, transform: [{ scale }, { rotate }] }}>
            <BadgeMedal category={view.category} tier={view.tier} color={view.color} icon={view.icon} size={120} rarity={view.rarity} />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="h2" style={{ color: C.text, textAlign: 'center' }}>
              {view.name}
            </Text>
            <Text variant="caption" style={{ color: C.textMuted, letterSpacing: 0.8 }}>
              {[CATEGORY_LABEL[view.category], view.tier && TIER_LABEL[view.tier]].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
            {view.description ? (
              <Text variant="body" style={{ color: C.textSecondary, textAlign: 'center', marginTop: 4 }}>
                {view.description}
              </Text>
            ) : null}
            {more > 0 && (
              <Text variant="caption" style={{ color: C.textSecondary, marginTop: 4 }}>
                +{more} more in your collection
              </Text>
            )}
          </View>
          {equip.error && <Notice tone="error">{formatApiError(equip.error, 'Could not equip this badge.')}</Notice>}
          <View style={styles.actions}>
            {!badge.isEquipped && (
              <>
                <PrimaryButton label="Equip" onPress={equipAndClose} loading={equip.isPending} />
                {slotHolder && (
                  <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
                    Replaces {memberBadgeView(slotHolder).name} in {CATEGORY_LABEL[view.category]}
                  </Text>
                )}
              </>
            )}
            <TextButton label={badge.isEquipped ? 'Nice' : 'Later'} onPress={close} disabled={equip.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, alignItems: 'center', gap: 18 },
  actions: { alignSelf: 'stretch', gap: 8 },
});
