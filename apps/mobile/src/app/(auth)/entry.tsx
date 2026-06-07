import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '../../components/Logo';
import { authService } from '../../services/auth.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';

export default function EntryScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 90, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(contentY, { toValue: 0, damping: 14, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleContinue = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter your gym code');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await authService.resolveCode(trimmed);
      await AsyncStorage.setItem('pending_gym_code', trimmed);
      await AsyncStorage.setItem('pending_gym_name', result.gymName ?? '');
      router.push('/(auth)/login');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Animated.View
          style={[
            styles.logoSection,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Logo size={80} showText gymName="FitZone" />
          <Text style={styles.tagline}>Your gym, in your pocket</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formSection,
            { opacity: contentOpacity, transform: [{ translateY: contentY }] },
          ]}
        >
          <Text style={styles.heading}>Enter your gym code</Text>
          <Text style={styles.subheading}>
            Ask your gym staff for the code if you don't have it yet
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="e.g. DEVGYM"
            placeholderTextColor={COLORS.textMuted}
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.buttonWrap, (isLoading || !code.trim()) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading || !code.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6EE7B7', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONT.regular,
    marginTop: SPACING.xs,
  },
  formSection: {
    gap: SPACING.md,
  },
  heading: {
    fontSize: 22,
    ...FONT.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONT.regular,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 18,
    ...FONT.semibold,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    ...FONT.regular,
    marginTop: -SPACING.xs,
  },
  buttonWrap: {
    borderRadius: RADIUS.button,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    ...FONT.semibold,
  },
});
