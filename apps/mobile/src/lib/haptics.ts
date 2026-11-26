import * as Haptics from 'expo-haptics';

// One place for haptic feedback so every screen uses the same strength for the same moment.
// Failures are ignored: some devices have no haptic engine.
export const haptic = {
  /** Tab presses, toggles, small selections. */
  tap: () => Haptics.selectionAsync().catch(() => {}),
  /** Primary button presses. */
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** A completed action: check-in, save, badge earned. */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** A blocked or failed action. */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
