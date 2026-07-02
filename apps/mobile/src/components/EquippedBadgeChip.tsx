import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EquippedBadgeDisplay } from '../types';

/**
 * Small badge chip rendered next to author names in chat and leaderboard rows.
 * Visual: a colored ring with a rank icon (🥇/🥈/🥉/◆), optionally followed
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
  const icon =
    badge.rank === 'GOLD'
      ? '🥇'
      : badge.rank === 'SILVER'
        ? '🥈'
        : badge.rank === 'BRONZE'
          ? '🥉'
          : '◆';
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
        <Text style={{ fontSize: size * 0.6 }}>{icon}</Text>
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
