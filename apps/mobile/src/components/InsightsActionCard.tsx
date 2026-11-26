import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import type { InsightsPendingAction } from '../types';

export type ActionStatus = 'waiting' | 'running' | 'done' | 'cancelled' | 'failed' | 'expired';

const STATUS_TEXT: Partial<Record<ActionStatus, string>> = {
  done: 'Done',
  cancelled: 'Cancelled. Nothing was changed.',
  failed: "This didn't go through.",
  expired: 'This expired. Ask again if you still want it.',
};

/** The API keeps a proposed action for 10 minutes. */
export const isExpired = (expiresAt: string) => Date.parse(expiresAt) <= Date.now();

/** An action the assistant proposed. Only these buttons make it happen; the assistant can't. */
export function InsightsActionCard({
  action,
  status,
  onConfirm,
  onCancel,
}: {
  action: InsightsPendingAction;
  status: ActionStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Checked on render too, so an old card doesn't offer a button that can only fail.
  const shown: ActionStatus = status === 'waiting' && isExpired(action.expiresAt) ? 'expired' : status;
  const open = shown === 'waiting' || shown === 'running';
  const running = status === 'running';

  return (
    <View
      accessibilityLabel="Action waiting for your confirmation"
      style={[styles.card, open && { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '12' }]}
    >
      <Text style={styles.summary}>{action.summary}</Text>
      {open ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.confirm, { backgroundColor: COLORS.primary }, running && styles.disabled]}
            onPress={onConfirm}
            disabled={running}
            accessibilityRole="button"
            accessibilityLabel={action.confirmLabel}
            activeOpacity={0.8}
          >
            {running ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={[styles.confirmText, { color: COLORS.onPrimary }]}>{action.confirmLabel}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancel, running && styles.disabled]}
            onPress={onCancel}
            disabled={running}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text accessibilityLiveRegion="polite" style={[styles.status, shown === 'done' && { color: COLORS.success }]}>
          {STATUS_TEXT[shown]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignSelf: 'stretch',
  },
  summary: { fontSize: 14, lineHeight: 20, color: COLORS.text, ...FONT.regular },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  confirm: { minHeight: 40, minWidth: 96, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 14, ...FONT.semibold },
  cancel: { minHeight: 40, paddingHorizontal: SPACING.md, justifyContent: 'center' },
  cancelText: { fontSize: 14, color: COLORS.textMuted, ...FONT.regular },
  disabled: { opacity: 0.5 },
  status: { fontSize: 12, color: COLORS.textMuted, ...FONT.regular },
});
