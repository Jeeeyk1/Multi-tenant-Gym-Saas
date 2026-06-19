import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { memberService } from '../../services/member.service';
import { aiService } from '../../services/ai.service';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/theme';
import type { FoodLog, MealAnalysis, WorkoutWeekPlan, WorkoutDay, WorkoutExercise, ExerciseInstructions } from '../../types';

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

const TODAY_NAME = new Date().toLocaleDateString('en-US', { weekday: 'long' });

function WorkoutTab({ gymId, memberId, theme }: TabProps) {
  const [weekPlan, setWeekPlan] = useState<WorkoutWeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const instructionsCache = useRef<Map<string, ExerciseInstructions>>(new Map());
  const gifCache = useRef<Map<string, string | null>>(new Map());

  const applyPlan = (parsed: WorkoutWeekPlan, generatedDate?: string) => {
    if (!Array.isArray(parsed.weekPlan) || parsed.weekPlan.length === 0) return;
    setWeekPlan(parsed);
    const todayEntry = parsed.weekPlan.find((d) => d.day === TODAY_NAME);
    setSelectedDay(todayEntry ? todayEntry.day : (parsed.weekPlan[0]?.day ?? null));
    if (generatedDate) setGeneratedAt(generatedDate);
  };

  useEffect(() => {
    if (!gymId || !memberId) return;
    aiService
      .getLatestWorkoutPlan(gymId, memberId)
      .then((saved) => {
        if (saved) {
          try { applyPlan(JSON.parse(saved.suggestion), saved.generatedAt); } catch { /* stale plan */ }
        }
      })
      .catch(() => {})
      .finally(() => setInitialising(false));
  }, [gymId, memberId]);

  const generate = useCallback(async () => {
    if (!gymId || !memberId) return;
    setLoading(true);
    try {
      const res = await aiService.getWorkoutSuggestion(gymId, memberId);
      applyPlan(JSON.parse(res.suggestion), new Date().toISOString());
    } catch {
      Alert.alert('Error', 'Could not generate workout plan. Try again.');
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  const activeDay: WorkoutDay | null =
    weekPlan?.weekPlan?.find((d) => d.day === selectedDay) ?? null;

  const planDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      {/* Generate button */}
      <Pressable
        style={[styles.generateBtn, { backgroundColor: theme.primary }, (loading || initialising) && styles.generateBtnDisabled]}
        onPress={generate}
        disabled={loading || initialising || !memberId}
      >
        {loading ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={16} color="#000" />
            <Text style={styles.generateBtnText}>{weekPlan ? 'Regenerate Plan' : 'Generate Weekly Plan'}</Text>
          </>
        )}
      </Pressable>

      {initialising && <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.md }} />}

      {weekPlan && !initialising && (
        <>
          {/* Day selector pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillRow}>
            {weekPlan.weekPlan.map((d) => {
              const isActive = d.day === selectedDay;
              const isToday = d.day === TODAY_NAME;
              return (
                <Pressable
                  key={d.day}
                  style={[
                    styles.dayPill,
                    isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setSelectedDay(d.day)}
                >
                  <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                    {d.day.slice(0, 3)}
                  </Text>
                  {isToday && <View style={[styles.todayDot, { backgroundColor: isActive ? '#000' : theme.primary }]} />}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active day header */}
          {activeDay && (
            <>
              <View style={[styles.planHeader, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
                <View style={styles.planHeaderRow}>
                  <Ionicons name="barbell-outline" size={20} color={theme.primary} />
                  <Text style={[styles.planFocus, { color: theme.primary }]}>{activeDay.focus}</Text>
                </View>
                <View style={styles.planMeta}>
                  <View style={styles.planMetaItem}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.planMetaText}>{activeDay.totalDurationMin} min</Text>
                  </View>
                  {planDate && (
                    <View style={styles.planMetaItem}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.planMetaText}>Generated {planDate}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Exercise sections */}
              {activeDay.sections.map((section) => (
                <View key={section.title} style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseRow}>
                    {section.exercises.map((ex, i) => (
                      <Pressable
                        key={i}
                        style={[styles.exerciseCard, { borderColor: theme.primary + '30' }]}
                        onPress={() => setSelectedExercise(ex)}
                      >
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <View style={styles.exerciseStats}>
                          {ex.sets != null && (
                            <View style={[styles.statPill, { backgroundColor: theme.primary + '15' }]}>
                              <Text style={[styles.statValue, { color: theme.primary }]}>{ex.sets}</Text>
                              <Text style={styles.statLabel}>sets</Text>
                            </View>
                          )}
                          {ex.reps != null && (
                            <View style={[styles.statPill, { backgroundColor: theme.primary + '15' }]}>
                              <Text style={[styles.statValue, { color: theme.primary }]}>{ex.reps}</Text>
                              <Text style={styles.statLabel}>reps</Text>
                            </View>
                          )}
                          {ex.restSec != null && (
                            <View style={styles.statPill}>
                              <Ionicons name="timer-outline" size={11} color={COLORS.textMuted} />
                              <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>{ex.restSec}s</Text>
                              <Text style={styles.statLabel}>rest</Text>
                            </View>
                          )}
                        </View>
                        {ex.tip && (
                          <View style={styles.tipRow}>
                            <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
                            <Text style={styles.tipText}>{ex.tip}</Text>
                          </View>
                        )}
                        <View style={styles.cardTapHint}>
                          <Ionicons name="chevron-forward" size={12} color={COLORS.textMuted} />
                          <Text style={styles.cardTapHintText}>How to do it</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!weekPlan && !initialising && !loading && (
        <View style={styles.workoutEmpty}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="barbell-outline" size={32} color={theme.primary} />
          </View>
          <Text style={styles.heroTitle}>Weekly Workout Plan</Text>
          <Text style={styles.heroSub}>
            Generate a full week of personalised sessions based on your goals and how many days you train.
          </Text>
        </View>
      )}

      {/* Exercise detail modal */}
      {selectedExercise && memberId && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          gymId={gymId}
          memberId={memberId}
          theme={theme}
          cache={instructionsCache}
          gifCache={gifCache}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </ScrollView>
  );
}

// ─── Exercise Detail Modal ────────────────────────────────────────────────────

function ExerciseDetailModal({
  exercise,
  gymId,
  memberId,
  theme,
  cache,
  gifCache,
  onClose,
}: {
  exercise: WorkoutExercise;
  gymId: string;
  memberId: string;
  theme: ReturnType<typeof useTheme>['theme'];
  cache: React.RefObject<Map<string, ExerciseInstructions>>;
  gifCache: React.RefObject<Map<string, string | null>>;
  onClose: () => void;
}) {
  const [instructions, setInstructions] = useState<ExerciseInstructions | null>(
    cache.current.get(exercise.name) ?? null,
  );
  const [loading, setLoading] = useState(!cache.current.has(exercise.name));
  const [gifUrl, setGifUrl] = useState<string | null>(
    gifCache.current.has(exercise.name) ? (gifCache.current.get(exercise.name) ?? null) : null,
  );

  useEffect(() => {
    if (cache.current.has(exercise.name)) return;
    aiService
      .getExerciseInstructions(gymId, memberId, exercise.name)
      .then((data) => {
        cache.current.set(exercise.name, data);
        setInstructions(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [exercise.name, gymId, memberId, cache]);

  useEffect(() => {
    if (gifCache.current.has(exercise.name)) return;
    aiService
      .getExerciseMedia(gymId, memberId, exercise.name)
      .then(({ gifUrl: url }) => {
        gifCache.current.set(exercise.name, url);
        setGifUrl(url);
      })
      .catch(() => gifCache.current.set(exercise.name, null));
  }, [exercise.name, gymId, memberId, gifCache]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.exModalContainer}>
        {/* Header */}
        <View style={styles.exModalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exModalTitle}>{exercise.name}</Text>
            {/* Sets / reps / rest summary */}
            <View style={styles.exModalStats}>
              {exercise.sets != null && (
                <Text style={[styles.exModalStat, { color: theme.primary }]}>{exercise.sets} sets</Text>
              )}
              {exercise.reps != null && (
                <Text style={[styles.exModalStat, { color: theme.primary }]}>{exercise.reps} reps</Text>
              )}
              {exercise.restSec != null && (
                <Text style={styles.exModalStat}>{exercise.restSec}s rest</Text>
              )}
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.exModalClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.exModalLoading}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={styles.exModalLoadingText}>Loading instructions…</Text>
          </View>
        ) : !instructions ? (
          <View style={styles.exModalLoading}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.exModalLoadingText}>Could not load instructions</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.exModalBody}>

            {/* Exercise GIF */}
            {gifUrl ? (
              <Image
                source={{ uri: gifUrl }}
                style={styles.exModalGif}
                resizeMode="contain"
              />
            ) : null}

            {/* Target muscles */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Target Muscles</Text>
              <View style={styles.muscleRow}>
                {instructions.targetMuscles.map((m) => (
                  <View key={m} style={[styles.musclePill, { backgroundColor: theme.primary + '18' }]}>
                    <Text style={[styles.musclePillText, { color: theme.primary }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Steps */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>How To Do It</Text>
              {instructions.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.primary }]}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Common mistakes */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Common Mistakes</Text>
              {instructions.commonMistakes.map((m, i) => (
                <View key={i} style={styles.mistakeRow}>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                  <Text style={styles.mistakeText}>{m}</Text>
                </View>
              ))}
            </View>

            {/* Modifications */}
            <View style={styles.exSection}>
              <Text style={styles.exSectionLabel}>Modifications</Text>
              <View style={styles.modCard}>
                <View style={styles.modRow}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modLabel}>Easier</Text>
                    <Text style={styles.modText}>{instructions.easier}</Text>
                  </View>
                </View>
                <View style={[styles.modRow, { marginTop: SPACING.sm }]}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modLabel, { color: theme.primary }]}>Harder</Text>
                    <Text style={styles.modText}>{instructions.harder}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Form tip from plan */}
            {exercise.tip && (
              <View style={[styles.exSection, styles.tipCard]}>
                <Ionicons name="bulb-outline" size={15} color={theme.primary} />
                <Text style={styles.tipCardText}>{exercise.tip}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
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

type ModalStep = 'photo' | 'uploading' | 'analysing' | 'result';

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
  const [step, setStep] = useState<ModalStep>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('photo');
    setPhotoUri(null);
    setPhotoUrl(null);
    setAnalysis(null);
    setNote('');
    setError(null);
    setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Pick photo ────────────────────────────────────────────────────────────

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Camera access is needed to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await uploadAndAnalyse(uri);
    } catch {
      setError('Could not access photo. Please try again.');
    }
  };

  // ── Upload + analyse ──────────────────────────────────────────────────────

  const uploadAndAnalyse = async (uri: string) => {
    if (!gymId || !memberId) return;
    setError(null);

    try {
      setStep('uploading');
      const { url } = await aiService.uploadFoodPhoto(gymId, memberId, uri);
      setPhotoUrl(url);

      setStep('analysing');
      const result = await aiService.analyseMeal(gymId, memberId, { photoUrl: url });
      setAnalysis(result);
      setStep('result');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Could not analyse the photo. Please try again.');
      setStep('photo');
    }
  };

  // ── Save to diary ─────────────────────────────────────────────────────────

  const save = async () => {
    if (!gymId || !memberId || !analysis) return;
    setSaving(true);
    try {
      const log = await aiService.logFood(gymId, memberId, {
        description: note.trim() || analysis.description,
        calories: analysis.calories,
        proteinG: analysis.proteinG,
        carbsG: analysis.carbsG,
        fatG: analysis.fatG,
      });
      onLogged(log);
      reset();
    } catch {
      Alert.alert('Error', 'Could not save the meal log.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = step === 'uploading' || step === 'analysing';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log a Meal</Text>
          <Pressable onPress={handleClose} disabled={isLoading}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACING.md }}>

          {/* ── Step: pick photo ── */}
          {step === 'photo' && (
            <>
              <View style={[styles.photoPlaceholder, { borderColor: theme.primary + '60' }]}>
                <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.photoPlaceholderText}>Take or choose a photo of your meal</Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={15} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: theme.primary }]}
                onPress={() => pickPhoto('camera')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#000" />
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoBtn, styles.photoBtnSecondary]}
                onPress={() => pickPhoto('gallery')}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={18} color={COLORS.text} />
                <Text style={[styles.photoBtnText, { color: COLORS.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: loading ── */}
          {isLoading && (
            <View style={styles.loadingState}>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              )}
              <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: SPACING.lg }} />
              <Text style={styles.loadingText}>
                {step === 'uploading' ? 'Uploading photo…' : 'Analysing your meal…'}
              </Text>
            </View>
          )}

          {/* ── Step: result ── */}
          {step === 'result' && analysis && (
            <>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              )}

              <View style={[styles.analysisCard, { borderColor: theme.primary + '40' }]}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="sparkles" size={14} color={theme.primary} />
                  <Text style={[styles.analysisTitle, { color: theme.primary }]}>AI Analysis</Text>
                </View>
                <Text style={styles.analysisDesc}>{analysis.description}</Text>
                <View style={styles.macroRow}>
                  <MacroChip label="Calories" value={`${analysis.calories}`} unit="kcal" theme={theme} />
                  <MacroChip label="Protein" value={`${analysis.proteinG}`} unit="g" theme={theme} />
                  <MacroChip label="Carbs" value={`${analysis.carbsG}`} unit="g" theme={theme} />
                  <MacroChip label="Fat" value={`${analysis.fatG}`} unit="g" theme={theme} />
                </View>
                {analysis.notes ? (
                  <Text style={styles.analysisNotes}>{analysis.notes}</Text>
                ) : null}
              </View>

              <View>
                <Text style={styles.inputLabel}>Add a note (optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="e.g. Large portion, homemade…"
                  placeholderTextColor={COLORS.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && styles.saveBtnDisabled]}
                onPress={save}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save to Diary</Text>
                )}
              </Pressable>

              <Pressable style={styles.retakeBtn} onPress={reset}>
                <Ionicons name="camera-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </Pressable>
            </>
          )}
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
  unit,
  theme,
}: {
  label: string;
  value: string;
  unit?: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={[styles.macroChip, { backgroundColor: theme.primary + '12' }]}>
      <Text style={[styles.macroValue, { color: theme.primary }]}>
        {value}{unit ? <Text style={styles.macroUnit}> {unit}</Text> : null}
      </Text>
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

  // Photo modal
  photoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    ...FONT.regular,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    ...FONT.regular,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
  },
  photoBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoBtnText: {
    fontSize: 15,
    color: '#000',
    ...FONT.semibold,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.border,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONT.regular,
    marginTop: SPACING.sm,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  analysisDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONT.regular,
    marginBottom: SPACING.sm,
  },
  macroUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    ...FONT.regular,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  retakeBtnText: {
    fontSize: 13,
    color: COLORS.textMuted,
    ...FONT.regular,
  },
  // Exercise card tap hint
  cardTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: SPACING.xs,
  },
  cardTapHintText: {
    fontSize: 10,
    color: COLORS.textMuted,
    ...FONT.regular,
  },
  // Exercise detail modal
  exModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  exModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  exModalTitle: {
    fontSize: 20,
    ...FONT.bold,
    color: COLORS.text,
  },
  exModalStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  exModalStat: {
    fontSize: 13,
    ...FONT.medium,
    color: COLORS.textSecondary,
  },
  exModalClose: {
    padding: 4,
    marginTop: 2,
  },
  exModalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  exModalLoadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    ...FONT.regular,
  },
  exModalBody: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  exModalGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  exSection: {
    gap: SPACING.sm,
  },
  exSectionLabel: {
    fontSize: 11,
    ...FONT.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  musclePill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  musclePillText: {
    fontSize: 13,
    ...FONT.semibold,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    ...FONT.bold,
    color: '#000',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    ...FONT.regular,
    lineHeight: 22,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONT.regular,
    lineHeight: 20,
  },
  modCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  modLabel: {
    fontSize: 11,
    ...FONT.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modText: {
    fontSize: 13,
    color: COLORS.text,
    ...FONT.regular,
    lineHeight: 19,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  tipCardText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONT.regular,
    lineHeight: 19,
  },
  planDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    ...FONT.regular,
    textAlign: 'center',
    marginTop: -SPACING.xs,
  },
  // Day selector
  dayPillRow: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  dayPill: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    gap: 3,
  },
  dayPillText: {
    fontSize: 13,
    ...FONT.semibold,
    color: COLORS.textSecondary,
  },
  dayPillTextActive: {
    color: '#000',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  // Workout plan cards
  workoutEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planHeader: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  planFocus: {
    fontSize: 17,
    ...FONT.bold,
  },
  planMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 2,
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    ...FONT.regular,
  },
  sectionBlock: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 13,
    ...FONT.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  exerciseRow: {
    gap: SPACING.sm,
    paddingBottom: 4,
  },
  exerciseCard: {
    width: 200,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  exerciseName: {
    fontSize: 14,
    ...FONT.bold,
    color: COLORS.text,
    lineHeight: 20,
  },
  exerciseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 12,
    ...FONT.bold,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.regular,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONT.regular,
    lineHeight: 16,
  },
});
