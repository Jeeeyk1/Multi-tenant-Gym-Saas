import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { memberService } from '../../services/member.service';
import { aiService } from '../../services/ai.service';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/theme';
import type { FoodLog, MealAnalysis } from '../../types';

type Tab = 'workout' | 'nutrition' | 'diary';

export default function AIScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('workout');
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.gymId) {
      memberService.getMyMember(user.gymId).then((m) => setMemberId(m.id));
    }
  }, [user?.gymId]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Ionicons name="flash" size={22} color="#000" />
        <Text style={styles.headerTitle}>AI Coach</Text>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['workout', 'nutrition', 'diary'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive, activeTab === t && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive, activeTab === t && { color: theme.primary }]}>
              {t === 'workout' ? 'Workout' : t === 'nutrition' ? 'Nutrition' : 'Food Diary'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'workout' && (
        <WorkoutTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
      {activeTab === 'nutrition' && (
        <NutritionTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
      {activeTab === 'diary' && (
        <DiaryTab gymId={user?.gymId ?? ''} memberId={memberId} theme={theme} />
      )}
    </View>
  );
}

// ─── Workout Tab ──────────────────────────────────────────────────────────────

function WorkoutTab({ gymId, memberId, theme }: TabProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!gymId || !memberId) return;
    setLoading(true);
    try {
      const res = await aiService.getWorkoutSuggestion(gymId, memberId);
      setSuggestion(res.suggestion);
    } catch {
      Alert.alert('Error', 'Could not generate workout plan. Try again.');
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.heroCard}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="barbell-outline" size={32} color={theme.primary} />
        </View>
        <Text style={styles.heroTitle}>Today's Workout Plan</Text>
        <Text style={styles.heroSub}>
          Get a personalised training plan based on your goals and activity level.
        </Text>
        <Pressable
          style={[styles.generateBtn, { backgroundColor: theme.primary }, loading && styles.generateBtnDisabled]}
          onPress={generate}
          disabled={loading || !memberId}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="flash-outline" size={16} color="#000" />
              <Text style={styles.generateBtnText}>Generate Plan</Text>
            </>
          )}
        </Pressable>
      </View>

      {suggestion && <SuggestionCard text={suggestion} icon="barbell-outline" theme={theme} />}
    </ScrollView>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────

function NutritionTab({ gymId, memberId, theme }: TabProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!gymId || !memberId) return;
    setLoading(true);
    try {
      const res = await aiService.getMealSuggestion(gymId, memberId);
      setSuggestion(res.suggestion);
    } catch {
      Alert.alert('Error', 'Could not generate meal plan. Try again.');
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.heroCard}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="nutrition-outline" size={32} color={theme.primary} />
        </View>
        <Text style={styles.heroTitle}>Nutrition Guidance</Text>
        <Text style={styles.heroSub}>
          Get a personalised meal plan and nutrition tips tailored to your fitness goal.
        </Text>
        <Pressable
          style={[styles.generateBtn, { backgroundColor: theme.primary }, loading && styles.generateBtnDisabled]}
          onPress={generate}
          disabled={loading || !memberId}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="flash-outline" size={16} color="#000" />
              <Text style={styles.generateBtnText}>Get Meal Plan</Text>
            </>
          )}
        </Pressable>
      </View>

      {suggestion && <SuggestionCard text={suggestion} icon="nutrition-outline" theme={theme} />}
    </ScrollView>
  );
}

// ─── Food Diary Tab ───────────────────────────────────────────────────────────

function DiaryTab({ gymId, memberId, theme }: TabProps) {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!gymId || !memberId) return;
    setLoading(true);
    try {
      const data = await aiService.listFoodLogs(gymId, memberId);
      setLogs(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onLogged = (log: FoodLog) => {
    setLogs((prev) => [log, ...prev]);
    setShowModal(false);
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.diaryHeader}>
        <Text style={styles.diaryTitle}>Today's Food Log</Text>
        <Pressable
          style={[styles.logBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowModal(true)}
          disabled={!memberId}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.logBtnText}>Log Meal</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xl }} />
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No meals logged yet</Text>
          <Text style={styles.emptySub}>Tap "Log Meal" to track what you eat</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
          {logs.map((log) => (
            <FoodLogRow key={log.id} log={log} theme={theme} />
          ))}
        </ScrollView>
      )}

      <LogMealModal
        visible={showModal}
        gymId={gymId}
        memberId={memberId}
        theme={theme}
        onClose={() => setShowModal(false)}
        onLogged={onLogged}
      />
    </View>
  );
}

// ─── Log Meal Modal ───────────────────────────────────────────────────────────

function LogMealModal({
  visible,
  gymId,
  memberId,
  theme,
  onClose,
  onLogged,
}: {
  visible: boolean;
  gymId: string;
  memberId: string | null;
  theme: ReturnType<typeof useTheme>['theme'];
  onClose: () => void;
  onLogged: (log: FoodLog) => void;
}) {
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDescription('');
    setAnalysis(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const analyse = async () => {
    if (!gymId || !memberId || description.trim().length < 3) return;
    setAnalysing(true);
    try {
      const result = await aiService.analyseMeal(gymId, memberId, description);
      setAnalysis(result);
    } catch {
      Alert.alert('Error', 'Could not estimate calories. You can still log the meal manually.');
    } finally {
      setAnalysing(false);
    }
  };

  const save = async () => {
    if (!gymId || !memberId || !description.trim()) return;
    setSaving(true);
    try {
      const log = await aiService.logFood(gymId, memberId, {
        description: analysis?.description ?? description,
        calories: analysis?.calories,
        proteinG: analysis?.proteinG,
        carbsG: analysis?.carbsG,
        fatG: analysis?.fatG,
      });
      onLogged(log);
      reset();
    } catch {
      Alert.alert('Error', 'Could not save the meal log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log a Meal</Text>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.inputLabel}>What did you eat?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Grilled chicken breast with rice and mixed vegetables"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={(t) => { setDescription(t); setAnalysis(null); }}
            multiline
            numberOfLines={3}
          />

          {!analysis && (
            <Pressable
              style={[styles.analyseBtn, { borderColor: theme.primary }, (analysing || description.trim().length < 3) && styles.analyseBtnDisabled]}
              onPress={analyse}
              disabled={analysing || description.trim().length < 3}
            >
              {analysing ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
                  <Text style={[styles.analyseBtnText, { color: theme.primary }]}>Estimate Calories with AI</Text>
                </>
              )}
            </Pressable>
          )}

          {analysis && (
            <View style={[styles.analysisCard, { borderColor: theme.primary + '40' }]}>
              <Text style={[styles.analysisTitle, { color: theme.primary }]}>AI Estimate</Text>
              <View style={styles.macroRow}>
                <MacroChip label="Calories" value={`${analysis.calories} kcal`} theme={theme} />
                <MacroChip label="Protein" value={`${analysis.proteinG}g`} theme={theme} />
                <MacroChip label="Carbs" value={`${analysis.carbsG}g`} theme={theme} />
                <MacroChip label="Fat" value={`${analysis.fatG}g`} theme={theme} />
              </View>
              {analysis.notes ? (
                <Text style={styles.analysisNotes}>{analysis.notes}</Text>
              ) : null}
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: theme.primary }, (!description.trim() || saving) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!description.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save to Diary</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SuggestionCard({
  text,
  icon,
  theme,
}: {
  text: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.suggestionCardHeader}>
        <Ionicons name={icon} size={16} color={theme.primary} />
        <Text style={[styles.suggestionCardLabel, { color: theme.primary }]}>AI Response</Text>
      </View>
      <Text style={styles.suggestionText}>{text}</Text>
    </View>
  );
}

function FoodLogRow({ log, theme }: { log: FoodLog; theme: ReturnType<typeof useTheme>['theme'] }) {
  const time = new Date(log.loggedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name="fast-food-outline" size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.logDesc}>{log.description}</Text>
        <Text style={styles.logMeta}>
          {log.calories ? `${log.calories} kcal · ` : ''}{time}
        </Text>
      </View>
    </View>
  );
}

function MacroChip({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={[styles.macroChip, { backgroundColor: theme.primary + '12' }]}>
      <Text style={[styles.macroValue, { color: theme.primary }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabProps {
  gymId: string;
  memberId: string | null;
  theme: ReturnType<typeof useTheme>['theme'];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    ...FONT.bold,
    color: '#000',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    ...FONT.medium,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    ...FONT.semibold,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: 18,
    ...FONT.bold,
    color: COLORS.text,
  },
  heroSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontSize: 14,
    ...FONT.semibold,
    color: '#000',
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  suggestionCardLabel: {
    fontSize: 12,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  // Diary tab
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  diaryTitle: {
    fontSize: 16,
    ...FONT.semibold,
    color: COLORS.text,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  logBtnText: {
    fontSize: 13,
    ...FONT.semibold,
    color: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    ...FONT.semibold,
    color: COLORS.textSecondary,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDesc: {
    fontSize: 14,
    ...FONT.medium,
    color: COLORS.text,
    marginBottom: 3,
  },
  logMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    ...FONT.bold,
    color: COLORS.text,
  },
  modalBody: {
    flex: 1,
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    ...FONT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  analyseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  analyseBtnDisabled: {
    opacity: 0.5,
  },
  analyseBtnText: {
    fontSize: 14,
    ...FONT.semibold,
  },
  analysisCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  analysisTitle: {
    fontSize: 12,
    ...FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  macroChip: {
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    minWidth: 70,
  },
  macroValue: {
    fontSize: 14,
    ...FONT.bold,
  },
  macroLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  analysisNotes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    ...FONT.semibold,
    color: '#000',
  },
});
