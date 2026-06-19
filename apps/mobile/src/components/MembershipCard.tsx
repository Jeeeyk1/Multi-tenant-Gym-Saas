import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import type { GymMember } from '../types';

interface MembershipCardProps {
  member: GymMember;
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function statusColor(status: GymMember['status']): string {
  if (status === 'ACTIVE') return COLORS.success;
  if (status === 'EXPIRED') return COLORS.expired;
  return COLORS.warning;
}

export function MembershipCard({ member }: MembershipCardProps) {
  const { theme } = useTheme();
  const days = daysUntil(member.expiryDate);
  const color = statusColor(member.status);

  // Build dark gradient from the gym's primary colour so the card always feels branded
  const cardGradient: [string, string] = [
    theme.primary + '22',
    theme.secondary + '11',
  ];

  const accent = theme.primary;

  return (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: accent + '33' }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: accent + 'BB' }]}>Plan</Text>
          <Text style={styles.planName}>{member.plan.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{member.status}</Text>
        </View>
      </View>

      <Text style={styles.memberName}>{member.user.fullName}</Text>
      <Text style={[styles.memberNumber, { color: accent + 'BB' }]}>{member.membershipNumber}</Text>

      <View style={[styles.footer, { borderTopColor: accent + '26' }]}>
        <View>
          <Text style={[styles.label, { color: accent + 'BB' }]}>Expires</Text>
          <Text style={styles.value}>
            {new Date(member.expiryDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        {member.status === 'ACTIVE' && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.label, { color: accent + 'BB' }]}>Days left</Text>
            <Text style={[styles.value, days <= 7 && { color: COLORS.warning }]}>
              {days}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 11,
    ...FONT.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  planName: {
    fontSize: 15,
    color: COLORS.text,
    ...FONT.semibold,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberName: {
    fontSize: 20,
    color: COLORS.text,
    ...FONT.bold,
    marginBottom: 2,
  },
  memberNumber: {
    fontSize: 12,
    ...FONT.regular,
    marginBottom: SPACING.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  value: {
    fontSize: 15,
    color: COLORS.text,
    ...FONT.semibold,
  },
});
