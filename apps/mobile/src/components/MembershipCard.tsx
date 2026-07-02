import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, FONT } from '../constants/theme';
import type { GymMember } from '../types';

interface MembershipCardProps {
  member: GymMember;
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function MembershipCard({ member }: MembershipCardProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const days = daysUntil(member.expiryDate);

  const statusColor =
    member.status === 'ACTIVE' ? C.success :
    member.status === 'EXPIRED' ? C.expired :
    C.suspended;

  const cardGradient: [string, string] = [
    theme.primary + '22',
    theme.secondary + '11',
  ];

  const s = useMemo(() => StyleSheet.create({
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
    planName: { fontSize: 15, color: C.text, ...FONT.semibold },
    statusBadge: {
      borderWidth: 1,
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    statusText: { fontSize: 11, ...FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
    memberName: { fontSize: 20, color: C.text, ...FONT.bold, marginBottom: 2 },
    memberNumber: { fontSize: 12, ...FONT.regular, marginBottom: SPACING.lg },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      paddingTop: SPACING.md,
    },
    value: { fontSize: 15, color: C.text, ...FONT.semibold },
  }), [C]);

  const accent = theme.primary;

  return (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, { borderColor: accent + '33' }]}
    >
      <View style={s.header}>
        <View>
          <Text style={[s.label, { color: accent + 'BB' }]}>Plan</Text>
          <Text style={s.planName}>{member.plan.name}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '33', borderColor: statusColor }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{member.status}</Text>
        </View>
      </View>

      <Text style={s.memberName}>{member.user.fullName}</Text>
      <Text style={[s.memberNumber, { color: accent + 'BB' }]}>{member.membershipNumber}</Text>

      <View style={[s.footer, { borderTopColor: accent + '26' }]}>
        <View>
          <Text style={[s.label, { color: accent + 'BB' }]}>Expires</Text>
          <Text style={s.value}>
            {new Date(member.expiryDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        {member.status === 'ACTIVE' && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.label, { color: accent + 'BB' }]}>Days left</Text>
            <Text style={[s.value, days <= 7 && { color: C.warning }]}>{days}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}
