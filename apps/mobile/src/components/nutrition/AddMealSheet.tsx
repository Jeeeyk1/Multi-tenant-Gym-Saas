import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Text } from '../Text';
import { useTheme } from '../../context/ThemeContext';
import { useAiUsage, useAnalyseMeal, useAnalyseMealPhoto, useLogFood, useRecentFoods } from '../../hooks/nutrition';
import { NumberField, Notice, PrimaryButton, TextButton } from '../onboarding/controls';
import { formatApiError } from '../../lib/format-error';
import { toNumber } from '../../lib/units';
import { AiThinking } from './AiThinking';
import { MealEstimateCard, type MealNumbers } from './MealEstimateCard';

// ai_usage_log feature keys (apps/api AiFeature)
const FEATURE_MEAL_TEXT = 'analyse_meal_text';
const FEATURE_MEAL_PHOTO = 'analyse_meal_photo';

const EXAMPLES = ['1 cup rice', '1 pc fried chicken', '2 eggs', '1 bowl sinigang', '1 banana', 'protein shake'];
const THINKING_LINES = ['Looking at your meal…', 'Checking the portions…', 'Counting the protein…', 'Almost there…'];

type Step = 'menu' | 'describe' | 'photo' | 'quick' | 'thinking' | 'result';

interface Estimate {
  meal: MealNumbers;
  note: string | null;
  /** Where it came from; "Try again" only makes sense for AI estimates. */
  source: 'text' | 'photo' | 'recent';
}

function Tile({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: C.surface, borderColor: C.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: theme.primaryMuted }]}>
        <Ionicons name={icon} size={22} color={theme.accentText} />
      </View>
      <Text variant="bodyMed" style={{ color: C.text }}>
        {title}
      </Text>
      <Text variant="caption" style={{ color: C.textSecondary, textAlign: 'center' }}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

/** Bottom sheet for logging a meal: photo, description or numbers, plus one-tap recents. */
export function AddMealSheet({
  visible,
  kcalLeftToday,
  onClose,
  onLogged,
}: {
  visible: boolean;
  kcalLeftToday: number | null;
  onClose: () => void;
  /** Called after a successful save with a short confirmation to show. */
  onLogged: (message: string) => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const analyseText = useAnalyseMeal();
  const analysePhoto = useAnalyseMealPhoto();
  const logFood = useLogFood();
  const recentQ = useRecentFoods();
  const usageQ = useAiUsage();
  const left = (feature: string) => usageQ.data?.features.find((f) => f.feature === feature)?.remaining;

  const [step, setStep] = useState<Step>('menu');
  const [description, setDescription] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [toLog, setToLog] = useState<MealNumbers | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep('menu');
    setDescription('');
    setKcal('');
    setProtein('');
    setEstimate(null);
    setToLog(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function estimateText() {
    setError(null);
    setStep('thinking');
    try {
      const a = await analyseText.mutateAsync(description.trim());
      setEstimate({
        meal: { description: description.trim() || a.description, calories: a.calories, proteinG: a.proteinG, carbsG: a.carbsG, fatG: a.fatG },
        note: a.notes || null,
        source: 'text',
      });
      setStep('result');
    } catch (err) {
      setError(formatApiError(err, 'Could not estimate this meal.'));
      setStep('describe');
    }
  }

  async function pickPhoto(fromCamera: boolean) {
    setError(null);
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Allow camera access in Settings to snap your meal.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.7, allowsEditing: true, aspect: [4, 3] };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;

      setStep('thinking');
      const a = await analysePhoto.mutateAsync(result.assets[0].uri);
      setEstimate({
        meal: { description: a.description, calories: a.calories, proteinG: a.proteinG, carbsG: a.carbsG, fatG: a.fatG },
        note: a.notes || null,
        source: 'photo',
      });
      setStep('result');
    } catch (err) {
      setError(formatApiError(err, 'Could not read this photo.'));
      setStep('photo');
    }
  }

  function pickRecent(log: { description: string; calories: number | null; proteinG: string | null; carbsG: string | null; fatG: string | null }) {
    Haptics.selectionAsync();
    setEstimate({
      meal: {
        description: log.description,
        calories: log.calories ?? 0,
        proteinG: toNumber(log.proteinG),
        carbsG: toNumber(log.carbsG),
        fatG: toNumber(log.fatG),
      },
      note: null,
      source: 'recent',
    });
    setStep('result');
  }

  async function save(meal: MealNumbers) {
    setError(null);
    try {
      await logFood.mutateAsync({
        description: meal.description,
        calories: meal.calories,
        proteinG: meal.proteinG ?? undefined,
        carbsG: meal.carbsG ?? undefined,
        fatG: meal.fatG ?? undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const after = kcalLeftToday === null ? null : kcalLeftToday - meal.calories;
      onLogged(
        after === null
          ? 'Meal logged.'
          : after < 0
            ? `Meal logged · ${Math.abs(after).toLocaleString()} kcal over today`
            : `Meal logged · ${after.toLocaleString()} kcal left today`,
      );
      close();
    } catch (err) {
      setError(formatApiError(err, 'Could not save this meal.'));
    }
  }

  const textLeft = left(FEATURE_MEAL_TEXT);
  const photoLeft = left(FEATURE_MEAL_PHOTO);
  const title =
    step === 'describe' ? 'Describe your meal' : step === 'photo' ? 'Snap your meal' : step === 'quick' ? 'Quick add' : step === 'result' ? 'Looks right?' : 'Log a meal';

  let body: React.ReactNode;
  switch (step) {
    case 'menu':
      body = (
        <View style={styles.gap}>
          <View style={styles.tiles}>
            <Tile
              icon="camera-outline"
              title="Snap it"
              subtitle={photoLeft !== undefined ? `${photoLeft} photo scans left` : 'AI reads your plate'}
              onPress={() => setStep('photo')}
              disabled={photoLeft === 0}
            />
            <Tile
              icon="chatbubble-ellipses-outline"
              title="Describe it"
              subtitle={textLeft !== undefined ? `${textLeft} estimates left` : 'Type what you ate'}
              onPress={() => setStep('describe')}
              disabled={textLeft === 0}
            />
            <Tile icon="create-outline" title="Quick add" subtitle="Enter the numbers" onPress={() => setStep('quick')} />
          </View>
          {(recentQ.data ?? []).length > 0 && (
            <>
              <Text variant="label" style={{ color: C.textSecondary, marginTop: 4 }}>
                EAT IT AGAIN
              </Text>
              <View style={styles.chips}>
                {recentQ.data!.map((log) => (
                  <Pressable
                    key={log.id}
                    onPress={() => pickRecent(log)}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${log.description} again, ${log.calories} calories`}
                    style={({ pressed }) => [styles.chip, { borderColor: C.border, backgroundColor: C.surface }, pressed && { opacity: 0.8 }]}
                  >
                    <Text variant="label" style={{ color: C.text }} numberOfLines={1}>
                      {log.description}
                    </Text>
                    <Text variant="caption" style={{ color: C.textMuted }}>
                      {log.calories} kcal
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      );
      break;

    case 'describe':
      body = (
        <View style={styles.gap}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. 1 cup rice and 2 pcs chicken adobo"
            placeholderTextColor={C.textMuted}
            multiline
            autoFocus
            maxLength={300}
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
            accessibilityLabel="What did you eat?"
          />
          <View style={styles.chips}>
            {EXAMPLES.map((ex) => (
              <Pressable
                key={ex}
                onPress={() => setDescription((d) => (d.trim() ? `${d.trim()}, ${ex}` : ex))}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ex}`}
                style={[styles.exChip, { borderColor: C.border }]}
              >
                <Text variant="caption" style={{ color: C.textSecondary }}>
                  + {ex}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text variant="caption" style={{ color: C.textMuted }}>
            Portions help: cups, pieces, grams or &quot;a plate&quot;.
          </Text>
          {error && <Notice tone="error">{error}</Notice>}
          <PrimaryButton label="Estimate with AI" onPress={estimateText} disabled={!description.trim() || textLeft === 0} />
          {textLeft !== undefined && (
            <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
              Uses 1 of {textLeft} AI estimates left this month
            </Text>
          )}
        </View>
      );
      break;

    case 'photo':
      body = (
        <View style={styles.gap}>
          <Text variant="label" style={{ color: C.textSecondary }}>
            Get the whole plate in the shot, from above if you can.
          </Text>
          {error && <Notice tone="error">{error}</Notice>}
          <PrimaryButton label="Open camera" onPress={() => pickPhoto(true)} disabled={photoLeft === 0} />
          <TextButton label="Choose from photos" onPress={() => pickPhoto(false)} disabled={photoLeft === 0} />
          {photoLeft !== undefined && (
            <Text variant="caption" style={{ color: C.textMuted, textAlign: 'center' }}>
              Uses 1 of {photoLeft} photo scans left this month
            </Text>
          )}
        </View>
      );
      break;

    case 'quick':
      body = (
        <View style={styles.gap}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What was it?"
            placeholderTextColor={C.textMuted}
            maxLength={300}
            style={[styles.input, styles.inputSingle, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
            accessibilityLabel="Meal name"
          />
          <View style={styles.row}>
            <NumberField label="Calories" value={kcal} onChange={setKcal} suffix="kcal" />
            <NumberField label="Protein" value={protein} onChange={setProtein} suffix="g" decimal />
          </View>
          {error && <Notice tone="error">{error}</Notice>}
          <PrimaryButton
            label="Log it"
            loading={logFood.isPending}
            disabled={!description.trim() || toNumber(kcal) === null}
            onPress={() =>
              save({
                description: description.trim(),
                calories: toNumber(kcal) ?? 0,
                proteinG: toNumber(protein),
                carbsG: null,
                fatG: null,
              })
            }
          />
        </View>
      );
      break;

    case 'thinking':
      body = <AiThinking lines={THINKING_LINES} />;
      break;

    case 'result':
      body = estimate ? (
        <View style={styles.gap}>
          <MealEstimateCard meal={estimate.meal} note={estimate.note} kcalLeftToday={kcalLeftToday} onPortionChange={setToLog}>
            {error && <Notice tone="error">{error}</Notice>}
            <PrimaryButton label="Log it" loading={logFood.isPending} onPress={() => save(toLog ?? estimate.meal)} />
          </MealEstimateCard>
          {estimate.source === 'text' && <TextButton label="Change the description" onPress={() => setStep('describe')} />}
          {estimate.source === 'photo' && <TextButton label="Try another photo" onPress={() => setStep('photo')} />}
          {estimate.source === 'recent' && <TextButton label="Back" onPress={() => setStep('menu')} />}
        </View>
      ) : null;
      break;
  }

  return (
    // Back can't dismiss while thinking: the request is already being charged, so show its result.
    <Modal visible={visible} transparent animationType="slide" onRequestClose={step === 'thinking' ? () => undefined : close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === 'thinking' ? undefined : close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: C.background }]}>
          <View style={[styles.grabber, { backgroundColor: C.border }]} />
          <View style={styles.header}>
            {step !== 'menu' && step !== 'thinking' ? (
              <Pressable onPress={() => setStep('menu')} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={C.text} />
              </Pressable>
            ) : null}
            <Text variant="h2" style={{ color: C.text, flex: 1 }}>
              {title}
            </Text>
            {step !== 'thinking' && (
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            )}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {body}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 28 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  gap: { gap: 12 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 6 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%', gap: 2 },
  exChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 88, textAlignVertical: 'top' },
  inputSingle: { minHeight: 0 },
  row: { flexDirection: 'row', gap: 10 },
});
