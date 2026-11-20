import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import type { EquippedBadgeDisplay } from '../types';

/**
 * Small badge chip rendered next to author names in chat and leaderboard rows.
 * Visual: a colored ring with a rank icon (medal / diamond), optionally followed
 * by the badge name when `showName` is true.
 */
export function EquippedBadgeChip({
  badge,
  showName = false,
  size = 16,
}: {
  badge: EquippedBadgeDisplay;
  showName?: boolean;
  size?: number;
}) {
  const iconName =
    badge.rank === 'GOLD' || badge.rank === 'SILVER' || badge.rank === 'BRONZE' ? 'medal' : 'diamond';
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: badge.color + '33',
            borderColor: badge.color,
          },
        ]}
      >
        <Ionicons name={iconName} size={size * 0.6} color={badge.color} />
      </View>
      {showName && (
        <Text style={[styles.name, { color: badge.color }]} numberOfLines={1}>
          {badge.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  name: { fontSize: 11, fontWeight: '600' },
});
