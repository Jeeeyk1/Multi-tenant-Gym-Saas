import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, type ColorPalette } from '../constants/theme';

export interface GymTheme {
  primary: string;
  secondary: string;
  gradient: [string, string];
  /** primary at ~12% opacity — tinted card/badge backgrounds */
  primaryMuted: string;
  logoUrl: string | null;
  colorScheme: 'light' | 'dark';
  /** Full color palette for the current mode — use this in screens instead of importing COLORS */
  colors: ColorPalette;
}

interface ThemeContextValue {
  theme: GymTheme;
  setGymTheme: (primary: string, secondary: string, logoUrl?: string | null) => Promise<void>;
  clearGymTheme: () => Promise<void>;
  toggleColorScheme: () => Promise<void>;
}

const STORAGE_PRIMARY = 'gym_primary_color';
const STORAGE_SECONDARY = 'gym_secondary_color';
const STORAGE_LOGO = 'gym_logo_url';
const STORAGE_COLOR_SCHEME = 'gym_color_scheme';

function buildTheme(
  primary: string,
  secondary: string,
  logoUrl: string | null = null,
  colorScheme: 'light' | 'dark' = 'dark',
): GymTheme {
  return {
    primary,
    secondary,
    gradient: [primary, secondary],
    primaryMuted: `${primary}20`,
    logoUrl,
    colorScheme,
    colors: colorScheme === 'light' ? LIGHT_COLORS : DARK_COLORS,
  };
}

const DEFAULT_THEME = buildTheme(DARK_COLORS.primary, DARK_COLORS.secondary);

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setGymTheme: async () => {},
  clearGymTheme: async () => {},
  toggleColorScheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<GymTheme>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.multiGet([
      STORAGE_PRIMARY,
      STORAGE_SECONDARY,
      STORAGE_LOGO,
      STORAGE_COLOR_SCHEME,
    ]).then(([[, primary], [, secondary], [, logoUrl], [, scheme]]) => {
      const colorScheme = scheme === 'light' ? 'light' : 'dark';
      if (primary || secondary || logoUrl || scheme) {
        setTheme(
          buildTheme(
            primary ?? DARK_COLORS.primary,
            secondary ?? DARK_COLORS.secondary,
            logoUrl ?? null,
            colorScheme,
          ),
        );
      }
    });
  }, []);

  const setGymTheme = async (primary: string, secondary: string, logoUrl?: string | null) => {
    const resolvedLogo = logoUrl ?? null;
    setTheme((prev) => buildTheme(primary, secondary, resolvedLogo, prev.colorScheme));
    await AsyncStorage.multiSet([
      [STORAGE_PRIMARY, primary],
      [STORAGE_SECONDARY, secondary],
      [STORAGE_LOGO, resolvedLogo ?? ''],
    ]);
  };

  const clearGymTheme = async () => {
    setTheme((prev) => buildTheme(DARK_COLORS.primary, DARK_COLORS.secondary, null, prev.colorScheme));
    await AsyncStorage.multiRemove([STORAGE_PRIMARY, STORAGE_SECONDARY, STORAGE_LOGO]);
  };

  const toggleColorScheme = async () => {
    const next = theme.colorScheme === 'dark' ? 'light' : 'dark';
    setTheme((prev) => buildTheme(prev.primary, prev.secondary, prev.logoUrl, next));
    await AsyncStorage.setItem(STORAGE_COLOR_SCHEME, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setGymTheme, clearGymTheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
