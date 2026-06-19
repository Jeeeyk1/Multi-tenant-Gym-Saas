import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export interface GymTheme {
  primary: string;
  secondary: string;
  gradient: [string, string];
  /** primary at ~12% opacity — use for tinted card/badge backgrounds */
  primaryMuted: string;
  logoUrl: string | null;
}

interface ThemeContextValue {
  theme: GymTheme;
  setGymTheme: (primary: string, secondary: string, logoUrl?: string | null) => Promise<void>;
  clearGymTheme: () => Promise<void>;
}

const STORAGE_PRIMARY = 'gym_primary_color';
const STORAGE_SECONDARY = 'gym_secondary_color';
const STORAGE_LOGO = 'gym_logo_url';

function buildTheme(primary: string, secondary: string, logoUrl: string | null = null): GymTheme {
  return {
    primary,
    secondary,
    gradient: [primary, secondary],
    primaryMuted: `${primary}20`,
    logoUrl,
  };
}

const DEFAULT_THEME = buildTheme(COLORS.primary, COLORS.secondary);

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setGymTheme: async () => {},
  clearGymTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<GymTheme>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_PRIMARY, STORAGE_SECONDARY, STORAGE_LOGO]).then(
      ([[, primary], [, secondary], [, logoUrl]]) => {
        if (primary || secondary || logoUrl) {
          setTheme(buildTheme(
            primary ?? COLORS.primary,
            secondary ?? COLORS.secondary,
            logoUrl ?? null,
          ));
        }
      },
    );
  }, []);

  const setGymTheme = async (primary: string, secondary: string, logoUrl?: string | null) => {
    const resolvedLogo = logoUrl ?? null;
    setTheme(buildTheme(primary, secondary, resolvedLogo));
    await AsyncStorage.multiSet([
      [STORAGE_PRIMARY, primary],
      [STORAGE_SECONDARY, secondary],
      [STORAGE_LOGO, resolvedLogo ?? ''],
    ]);
  };

  const clearGymTheme = async () => {
    setTheme(DEFAULT_THEME);
    await AsyncStorage.multiRemove([STORAGE_PRIMARY, STORAGE_SECONDARY, STORAGE_LOGO]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setGymTheme, clearGymTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
