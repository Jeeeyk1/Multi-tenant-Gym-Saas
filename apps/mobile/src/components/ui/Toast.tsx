import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SHADOW_1, SPACING } from '../../constants/theme';
import { fonts } from '../../theme/typography';
import { SPRING } from '../../theme/motion';
import { haptic } from '../../lib/haptics';
import { Text } from '../Text';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastOptions {
  tone?: ToastTone;
  /** One action, usually Undo. Keeps the toast up longer. */
  action?: { label: string; onPress: () => void };
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<{ show: (message: string, options?: ToastOptions) => void }>({ show: () => {} });

const DURATION_MS = 3200;
const DURATION_WITH_ACTION_MS = 5000;

/**
 * Confirms that something happened without blocking the screen. Use it instead of
 * Alert.alert for results and errors; keep Alert for questions that need an answer.
 */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, ...options });
    AccessibilityInfo.announceForAccessibility(message);
    if (options.tone === 'error') haptic.error();
  }, []);

  // Stable, so a re-render above the provider (e.g. a workout timer tick) doesn't restart the toast's timer.
  const handleHidden = useCallback((id: number) => setToast((t) => (t?.id === id ? null : t)), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onHidden={handleHidden} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHidden }: { toast: ToastState; onHidden: (id: number) => void }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const hide = useCallback(() => {
    opacity.value = withTiming(0, { duration: 180 });
    offset.value = withTiming(-120, { duration: 220 }, (finished) => {
      if (finished) scheduleOnRN(onHidden, toast.id);
    });
  }, [offset, opacity, onHidden, toast.id]);

  useEffect(() => {
    offset.value = withSpring(0, SPRING.bouncy);
    opacity.value = withTiming(1, { duration: 120 });
    const timer = setTimeout(hide, toast.action ? DURATION_WITH_ACTION_MS : DURATION_MS);
    return () => clearTimeout(timer);
  }, [hide, offset, opacity, toast.action]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: offset.value }] }));

  const icon = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' }[toast.tone ?? 'success'] as keyof typeof Ionicons.glyphMap;
  // Semantic green, not the gym's colour: toasts also show on staff screens, which never use gym colours.
  const iconColor = toast.tone === 'error' ? C.error : toast.tone === 'info' ? C.textSecondary : C.success;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + SPACING.sm }, style]}>
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        accessibilityHint="Tap to dismiss"
        style={[styles.toast, SHADOW_1, { backgroundColor: C.surface, borderColor: C.border }]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={[styles.message, { color: C.text }]} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action ? (
          <View>
            <Pressable
              onPress={() => {
                toast.action?.onPress();
                hide();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <Text style={[styles.action, { color: C.text }]}>{toast.action.label}</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    minHeight: 52,
  },
  message: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 },
  action: { fontFamily: fonts.headingBold, fontSize: 14 },
});
