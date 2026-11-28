import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useWeighIn, useWeightLogs } from '../../hooks/fitness-plan';
import { NumberField, Notice, PrimaryButton, TextButton } from '../onboarding/controls';
import { kgToLb, lbToKg, toNumber } from '../../lib/units';
import { formatApiError } from '../../lib/format-error';
import type { FitnessPlan, WeighInResult } from '../../types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHART_W = 120;
const CHART_H = 44;

function Sparkline({ values, target, color, targetColor }: { values: number[]; target: number | null; color: string; targetColor: string }) {
  if (values.length < 2) return null;
  const all = target !== null ? [...values, target] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const y = (v: number) => CHART_H - 4 - ((v - min) / span) * (CHART_H - 8);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * CHART_W},${y(v)}`).join(' ');
  return (
    <Svg width={CHART_W} height={CHART_H} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {target !== null && (
        <Line x1={0} x2={CHART_W} y1={y(target)} y2={y(target)} stroke={targetColor} strokeWidth={1} strokeDasharray="4 4" />
      )}
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

/** Current weight, trend toward the goal, and the weekly weigh-in. */
export function WeightCard({
  plan,
  imperial,
  onGoalReached,
}: {
  plan: FitnessPlan | null;
  imperial: boolean;
  onGoalReached: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const logsQ = useWeightLogs();
  const weighIn = useWeighIn();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<WeighInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unit = imperial ? 'lb' : 'kg';
  const show = (kg: number) => (imperial ? Math.round(kgToLb(kg) * 10) / 10 : Math.round(kg * 10) / 10);

  const logs = (logsQ.data ?? [])
    .map((l) => ({ kg: toNumber(l.weightKg), at: new Date(l.loggedAt).getTime() }))
    .filter((l): l is { kg: number; at: number } => l.kg !== null);
  const latest = logs[0] ?? null;
  const current = latest?.kg ?? plan?.weightKg ?? null;
  const target = plan?.targetWeightKg ?? null;
  const due = !latest || Date.now() - latest.at > WEEK_MS;
  const trend = logs.slice(0, 12).reverse().map((l) => l.kg);

  async function save() {
    const n = toNumber(value);
    if (n === null) return;
    setError(null);
    try {
      // The API takes kg with at most 2 decimals.
      const res = await weighIn.mutateAsync(imperial ? lbToKg(n) : Math.round(n * 100) / 100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(res);
      setOpen(false);
      setValue('');
    } catch (err) {
      setError(formatApiError(err, 'Could not save your weight.'));
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" style={{ color: C.textSecondary }}>
            WEIGHT
          </Text>
          <Text variant="metric" style={{ color: C.text }}>
            {current !== null ? `${show(current)} ${unit}` : '—'}
          </Text>
          {target !== null && current !== null && (
            <Text variant="caption" style={{ color: C.textSecondary }}>
              Goal {show(target)} {unit} · {show(Math.abs(current - target))} {unit} to go
            </Text>
          )}
        </View>
        <Sparkline values={trend} target={target} color={theme.primary} targetColor={C.textMuted} />
      </View>

      {result?.goalReached ? (
        <Pressable onPress={onGoalReached} accessibilityRole="button">
          <Notice tone="info">You reached your goal weight! Tap to set your next goal.</Notice>
        </Pressable>
      ) : result?.planUpdated && result.plan ? (
        <Notice tone="info">
          Nice progress! Your plan was updated to {result.plan.targetKcal.toLocaleString()} kcal a day.
        </Notice>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.weighBtn,
          { borderColor: due ? theme.primary : C.border, backgroundColor: due ? theme.primaryMuted : 'transparent' },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="scale-outline" size={18} color={due ? theme.accentText : C.textSecondary} />
        <Text variant="label" style={{ color: due ? theme.accentText : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
          {due ? 'Time for your weekly weigh-in' : 'Log weight'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: C.background }]}>
            <Text variant="h2" style={{ color: C.text }}>
              Weigh-in
            </Text>
            <Text variant="caption" style={{ color: C.textSecondary }}>
              Same time of day each week gives the clearest trend — mornings are best.
            </Text>
            <NumberField label="Today's weight" value={value} onChange={setValue} suffix={unit} decimal />
            {error && <Notice tone="error">{error}</Notice>}
            <PrimaryButton label="Save" onPress={save} disabled={toNumber(value) === null} loading={weighIn.isPending} />
            <TextButton label="Cancel" onPress={() => setOpen(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weighBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
});
