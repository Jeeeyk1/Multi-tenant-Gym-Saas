import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { STAFF_COLORS as COLORS, SPACING, RADIUS, FONT } from '../constants/theme';

// Chat bubble is maxWidth 86% of screen; account for the card's horizontal padding + border.
const TREND_W = Math.round(Dimensions.get('window').width * 0.86) - SPACING.sm * 2 - 2;
const TREND_H = 64;

function shortDate(period: string): string {
  const d = new Date(`${period}T00:00:00`);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// At most three labels (start / middle / end) so the axis never crams dates together.
function pickAxisLabels(rows: { period: string }[]): string[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [shortDate(rows[0].period)];
  if (rows.length === 2) return [shortDate(rows[0].period), shortDate(rows[1].period)];
  return [
    shortDate(rows[0].period),
    shortDate(rows[Math.floor(rows.length / 2)].period),
    shortDate(rows[rows.length - 1].period),
  ];
}

function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface MemberRow {
  memberId: string;
  name: string;
  membershipNumber: string;
  status: string;
}

function asMemberList(data: unknown): MemberRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const ok = data.every((r) => isRecord(r) && typeof r.name === 'string' && typeof r.membershipNumber === 'string');
  return ok ? (data as MemberRow[]) : null;
}

interface CheckinStatus {
  found: boolean;
  member?: string;
  date?: string;
  checkedIn?: boolean;
  count?: number;
}

function asCheckinStatus(data: unknown): CheckinStatus | null {
  return isRecord(data) && typeof data.found === 'boolean' ? (data as unknown as CheckinStatus) : null;
}

function asMetric(data: unknown): { value: number } | { groupedBy: string; rows: { group: string; value: number }[] } | null {
  if (!isRecord(data)) return null;
  if (typeof data.value === 'number') return { value: data.value };
  if (typeof data.groupedBy === 'string' && Array.isArray(data.rows)) {
    return data as { groupedBy: string; rows: { group: string; value: number }[] };
  }
  return null;
}

function asTrend(data: unknown): { rows: { period: string; value: number }[] } | null {
  if (isRecord(data) && Array.isArray(data.rows)) return data as { rows: { period: string; value: number }[] };
  return null;
}

interface PlanRow {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

function asPlanList(data: unknown): PlanRow[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const ok = data.every((r) => isRecord(r) && typeof r.name === 'string' && typeof r.price === 'number');
  return ok ? (data as PlanRow[]) : null;
}

function asActionResult(data: unknown): Record<string, unknown> | null {
  return isRecord(data) && data.ok === true ? data : null;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: COLORS.active,
  EXPIRED: COLORS.expired,
  SUSPENDED: COLORS.suspended,
};

const ACTION_LABEL: Record<string, string> = {
  register_member: 'Member invited',
  renew_membership: 'Membership renewed',
  suspend_member: 'Member suspended',
  reactivate_member: 'Member reactivated',
};

/** Renders a tool's structured result as UI instead of leaving it as prose. Renders nothing
 * for shapes it doesn't recognize, so the caller can fall back to plain text. */
export function InsightsToolResultView({ tool, data }: { tool: string; data: unknown }) {
  switch (tool) {
    case 'find_member': {
      const rows = asMemberList(data);
      return rows ? (
        <Card>
          {rows.map((r, i) => (
            <View key={r.memberId} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.name}</Text>
                <Text style={styles.rowSub}>{r.membershipNumber}</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLOR[r.status] ?? COLORS.textMuted }]} />
                <Text style={styles.rowSub}>{r.status}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null;
    }

    case 'get_member_checkin_status': {
      const status = asCheckinStatus(data);
      if (!status) return null;
      if (!status.found) return <Card><Text style={styles.rowSub}>Member not found.</Text></Card>;
      return (
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{status.member}</Text>
              <Text style={styles.rowSub}>{status.date}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.checkedIn ? COLORS.successBg : COLORS.background }]}>
              <Text style={[styles.badgeText, { color: status.checkedIn ? COLORS.success : COLORS.textMuted }]}>
                {status.checkedIn ? `Checked in · ${status.count}` : 'Not checked in'}
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    case 'query_metric': {
      const metric = asMetric(data);
      if (!metric) return null;
      if ('value' in metric) {
        return <Card><Text style={styles.metricValue}>{metric.value.toLocaleString()}</Text></Card>;
      }
      const max = Math.max(...metric.rows.map((r) => r.value), 1);
      return (
        <Card>
          {metric.rows.map((r) => (
            <View key={r.group} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{r.group}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(r.value / max) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{r.value}</Text>
            </View>
          ))}
        </Card>
      );
    }

    case 'get_trend': {
      const trend = asTrend(data);
      if (!trend || trend.rows.length === 0) return null;
      const rows = trend.rows;
      const max = Math.max(...rows.map((r) => r.value), 1);
      const n = rows.length;
      const pad = 4;
      const px = (i: number) => (n <= 1 ? TREND_W / 2 : (i / (n - 1)) * TREND_W);
      const py = (v: number) => TREND_H - pad - (v / max) * (TREND_H - pad * 2);
      const points = rows.map((r, i) => `${px(i).toFixed(1)},${py(r.value).toFixed(1)}`);
      const line = `M${points.join(' L')}`;
      const area = `${line} L${TREND_W},${TREND_H} L0,${TREND_H} Z`;
      const labels = pickAxisLabels(rows);
      const latest = rows[n - 1];
      return (
        <Card>
          <View style={styles.trendHeader}>
            <Text style={styles.metricValue}>{latest.value.toLocaleString()}</Text>
            <Text style={styles.rowSub}>latest</Text>
          </View>
          <Svg width={TREND_W} height={TREND_H}>
            <Defs>
              <LinearGradient id="insightsTrend" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLORS.primary} stopOpacity={0.25} />
                <Stop offset="1" stopColor={COLORS.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#insightsTrend)" />
            <Path d={line} stroke={COLORS.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
          <View style={styles.trendLabels}>
            {labels.map((l, i) => (
              <Text key={i} style={styles.rowSub}>{l}</Text>
            ))}
          </View>
        </Card>
      );
    }

    case 'list_membership_plans': {
      const plans = asPlanList(data);
      return plans ? (
        <Card>
          {plans.map((p, i) => (
            <View key={p.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowTitle}>{p.name}</Text>
              <Text style={styles.rowSub}>{formatPhp(p.price)} · {p.durationDays}d</Text>
            </View>
          ))}
        </Card>
      ) : null;
    }

    case 'register_member':
    case 'renew_membership':
    case 'suspend_member':
    case 'reactivate_member': {
      const result = asActionResult(data);
      if (!result) return null;
      return (
        <Card>
          <View style={styles.actionRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.rowTitle}>{ACTION_LABEL[tool] ?? 'Done'}</Text>
          </View>
          {typeof result.invitedEmail === 'string' && (
            <Text style={styles.rowSub}>{result.invitedEmail}</Text>
          )}
        </Card>
      );
    }

    default:
      return null;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    maxWidth: '86%',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowTitle: { fontSize: 13, color: COLORS.text, ...FONT.medium },
  rowSub: { fontSize: 11, color: COLORS.textMuted, ...FONT.regular, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill},
  badgeText: { fontSize: 11, ...FONT.semibold },
  metricValue: { fontSize: 24, lineHeight: 29, color: COLORS.text, ...FONT.bold },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  barLabel: { fontSize: 11, color: COLORS.textMuted, width: 80 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  barValue: { fontSize: 11, color: COLORS.text, ...FONT.semibold, width: 28, textAlign: 'right' },
  trendHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  trendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
