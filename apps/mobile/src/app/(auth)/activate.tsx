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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../services/auth.service';
import { COLORS, SPACING, RADIUS, FONT } from '../../constants/theme';

export default function ActivateScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleActivate = async () => {
    if (!token) {
      setError('Activation token is missing. Please use the link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await authService.activate(token, password);
      setDone(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Activation failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneIcon}>✓</Text>
        <Text style={styles.doneTitle}>Account activated!</Text>
        <Text style={styles.doneText}>You can now sign in with your new password.</Text>
        <TouchableOpacity
          style={styles.buttonWrap}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#6EE7B7', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.title}>Set your password</Text>
        <Text style={styles.subtitle}>Create a password to activate your account</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={COLORS.textMuted}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(null); }}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleActivate}
            />
          </View>

          <TouchableOpacity
            style={[styles.buttonWrap, isLoading && styles.buttonDisabled]}
            onPress={handleActivate}
            disabled={isLoading}
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
                <Text style={styles.buttonText}>Activate Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  title: { fontSize: 28, ...FONT.bold, color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13, ...FONT.regular },
  form: { gap: SPACING.md },
  field: { gap: SPACING.xs },
  label: { fontSize: 13, color: COLORS.textSecondary, ...FONT.medium },
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
  buttonWrap: {
    borderRadius: RADIUS.button,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontSize: 16, ...FONT.semibold },
  doneContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  doneIcon: { fontSize: 64, color: COLORS.success },
  doneTitle: { fontSize: 24, ...FONT.bold, color: COLORS.text },
  doneText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
