import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../../components/Logo';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const [gymName, setGymName] = useState('');
  const [gymLogo, setGymLogo] = useState('');
  const [gymCode, setGymCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['pending_gym_code', 'pending_gym_name', 'pending_gym_logo']).then((values) => {
      if (values[0][1]) setGymCode(values[0][1]);
      if (values[1][1]) setGymName(values[1][1]);
      if (values[2][1]) setGymLogo(values[2][1]);
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await signIn(gymCode, email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'INVALID_CREDENTIALS') {
        setError('Wrong email or password. Please try again.');
      } else if (e.code === 'MEMBERSHIP_SUSPENDED') {
        setError('Your account has been suspended. Contact your gym.');
      } else {
        setError(e.message ?? 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Change code</Text>
        </TouchableOpacity>

        {/* Gym identity header */}
        <View style={styles.header}>
          {gymLogo ? (
            <Image source={{ uri: gymLogo }} style={styles.gymLogoImg} resizeMode="contain" />
          ) : (
            <Logo size={64} showText={false} />
          )}
          {gymName ? (
            <Text style={styles.gymNameTitle}>{gymName}</Text>
          ) : null}
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.showHide}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={[styles.showHideText, { color: theme.primary }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.buttonWrap, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          First time? Check your email for an activation link from your gym.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  backButton: {
    marginBottom: SPACING.xl,
  },
  backText: {
    fontSize: 14,
    ...FONT.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  gymLogoImg: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: SPACING.xs,
  },
  gymNameTitle: {
    fontSize: 24,
    ...FONT.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONT.regular,
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    ...FONT.regular,
  },
  form: {
    gap: SPACING.md,
  },
  field: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONT.medium,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  showHide: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  showHideText: {
    fontSize: 13,
    ...FONT.medium,
  },
  buttonWrap: {
    borderRadius: RADIUS.button,
    overflow: 'hidden',
    marginTop: SPACING.sm,
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
  hint: {
    marginTop: SPACING.xl,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    ...FONT.regular,
  },
});
