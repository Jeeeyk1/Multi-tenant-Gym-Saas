import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import { useFonts } from 'expo-font';
import {
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import { AppSplash } from '../components/AppSplash';
import { AppLoader } from '../components/AppLoader';
import { BRAND, COLORS } from '../constants/theme';
import { queryClient, subscribeAppStateToFocusManager } from '../lib/query-client';
import { subscribeToNotificationTaps } from '../services/push.service';

function RootNavigator() {
  const { isLoading, subscriptionLocked, signOut } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <AppLoader />
      </View>
    );
  }

  if (subscriptionLocked) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          Subscription inactive
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          This gym&apos;s subscription is currently inactive. Please contact your gym owner to
          resolve billing before continuing.
        </Text>
        <Pressable onPress={signOut} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(member)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => subscribeAppStateToFocusManager(), []);
  useEffect(() => subscribeToNotificationTaps(), []);

  if (!fontsLoaded) {
    return (
      // Plain Navy while fonts load: it continues the native splash until the animated one starts.
      <View style={{ flex: 1, backgroundColor: BRAND.navy }} />
    );
  }

  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <AppSplash onDone={() => setSplashDone(true)} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <WorkoutProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </WorkoutProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
