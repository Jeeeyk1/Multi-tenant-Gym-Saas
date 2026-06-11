import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { memberService } from '../../services/member.service';
import { AnimatedMascot } from '../../components/AnimatedMascot';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';
import type { CheckIn } from '../../types';

type Status = 'idle' | 'loading' | 'checked_in' | 'already_in' | 'error';

export default function CheckInScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status>('idle');
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Button press bounce
  const buttonScale = useRef(new Animated.Value(1)).current;
  // Pulsing ring for idle state
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  // Success mascot fade
  const mascotOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation — only when idle
  useEffect(() => {
    if (status !== 'idle') {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.45, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status]);

  // Mascot fade on success
  useEffect(() => {
    if (status === 'checked_in') {
      Animated.timing(mascotOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } else {
      mascotOpacity.setValue(0);
    }
  }, [status]);

  const animateButtonBounce = () => {
    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 1.1, damping: 5, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, damping: 12, useNativeDriver: true }),
    ]).start();
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setStatus('loading');
    try {
      const res = await memberService.selfCheckIn(user.gymId);
      setCheckIn(res);
      setStatus('checked_in');
      animateButtonBounce();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e.code === 'ALREADY_CHECKED_IN') {
        setStatus('already_in');
        setErrorMsg("You're already checked in today.");
      } else if (e.code === 'MEMBERSHIP_EXPIRED') {
        setStatus('error');
        setErrorMsg('Your membership has expired. Please renew at the front desk.');
      } else if (e.code === 'MEMBER_NOT_ACTIVE') {
        setStatus('error');
        setErrorMsg('Your account is not active. Please contact the gym.');
      } else if (e.code === 'MEMBER_NOT_FOUND') {
        setStatus('error');
        setErrorMsg('Member record not found. Please contact the gym.');
      } else {
        setStatus('error');
        setErrorMsg(e.message ?? 'Check-in failed. Please try again.');
      }
    }
  };

  const reset = () => {
    setStatus('idle');
    setCheckIn(null);
    setErrorMsg('');
  };

  const isIdle = status === 'idle';
  const isSuccess = status === 'checked_in';
  const isError = status === 'error' || status === 'already_in';
  const isWarn = status === 'already_in';

  const buttonColors: [string, string] = isSuccess
    ? [COLORS.success, '#16a34a']
    : isError
    ? isWarn
      ? [COLORS.warning, '#d97706']
      : [COLORS.error, '#dc2626']
    : theme.gradient;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Check In</Text>
      <Text style={styles.subheading}>Tap to record your visit</Text>

      {/* Success state */}
      {isSuccess && checkIn && (
        <Animated.View style={[styles.successBox, { opacity: mascotOpacity }]}>
          <AnimatedMascot size="md" />
          <Text style={styles.successTitle}>You're in! 🎉</Text>
          <Text style={styles.successTime}>
            {new Date(checkIn.checkedInAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Animated.View>
      )}

      {/* Error / already-in state */}
      {isError && (
        <View style={[styles.statusBox, isWarn ? styles.warnBox : styles.errorBox]}>
          <Text style={[styles.statusText, { color: isWarn ? COLORS.warning : COLORS.error }]}>
            {errorMsg}
          </Text>
        </View>
      )}

      {/* Big button */}
      <View style={styles.buttonArea}>
        {/* Pulsing ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity, backgroundColor: theme.primary },
          ]}
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={isIdle ? handleCheckIn : reset}
            disabled={status === 'loading'}
            style={[styles.buttonPressable, { shadowColor: theme.primary }]}
          >
            <LinearGradient
              colors={buttonColors}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.bigButton}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Text style={styles.bigButtonEmoji}>
                    {isSuccess ? '✓' : isError ? '↩' : '⚡'}
                  </Text>
                  <Text style={[styles.bigButtonLabel, isIdle && { color: '#000' }]}>
                    {isSuccess
                      ? 'Tap to reset'
                      : isError
                      ? 'Try again'
                      : 'Check In'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {isIdle && (
        <Text style={styles.hint}>
          Your visit will be recorded and your streak updated automatically.
        </Text>
      )}
    </View>
  );
}

const BUTTON_SIZE = 190;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  heading: {
    fontSize: 26,
    ...FONT.bold,
    color: COLORS.text,
    marginTop: SPACING.xl + SPACING.md,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  successBox: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  successTitle: {
    fontSize: 20,
    ...FONT.bold,
    color: COLORS.success,
  },
  successTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error,
  },
  warnBox: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  statusText: {
    fontSize: 14,
    ...FONT.regular,
    textAlign: 'center',
  },
  buttonArea: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: COLORS.primary,
  },
  buttonPressable: {
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  bigButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  bigButtonEmoji: { fontSize: 46 },
  bigButtonLabel: {
    fontSize: 15,
    ...FONT.semibold,
    color: '#fff',
  },
  hint: {
    marginTop: SPACING.xxl,
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
  },
});
