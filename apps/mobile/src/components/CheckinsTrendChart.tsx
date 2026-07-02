import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useCheckinsTrend } from '../hooks/reports';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';

const CARD_HORIZONTAL_PADDING = SPACING.md * 2;
const CHART_WIDTH = Dimensions.get('window').width - SPACING.lg * 2 - CARD_HORIZONTAL_PADDING;

type RangeOption = 7 | 30;

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function CheckinsTrendChart() {
  const { theme } = useTheme();
  const [range, setRange] = useState<RangeOption>(7);
  const trendQ = useCheckinsTrend(range);
  const data = trendQ.data ?? [];

  // 30-day chart is too dense to label every day — show every 5th label.
  const labels = data.map((point, idx) =>
    range === 30 && idx % 5 !== 0 ? '' : formatDayLabel(point.date),
  );
  const counts = data.map((point) => point.count);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>CHECK-INS TREND</Text>
        <View style={styles.toggleRow}>
          {([7, 30] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.toggleBtn, range === option && { backgroundColor: theme.primary }]}
              onPress={() => setRange(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, range === option && styles.toggleTextActive]}>
                {option}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {trendQ.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : trendQ.isError || data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No check-in data yet</Text>
        </View>
      ) : (
        <BarChart
          data={{ labels, datasets: [{ data: counts }] }}
          width={CHART_WIDTH}
          height={180}
          fromZero
          withInnerLines={false}
          showValuesOnTopOfBars={false}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundGradientFrom: COLORS.surface,
            backgroundGradientTo: COLORS.surface,
            decimalPlaces: 0,
            color: () => theme.primary,
            labelColor: () => COLORS.textMuted,
            barPercentage: range === 30 ? 0.5 : 0.6,
            propsForBackgroundLines: { stroke: COLORS.border },
          }}
          style={styles.chart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  toggleText: { fontSize: 11, color: COLORS.textMuted, ...FONT.medium },
  toggleTextActive: { color: '#000' },
  centered: { height: 180, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  chart: { marginLeft: -SPACING.md, borderRadius: RADIUS.md },
});
