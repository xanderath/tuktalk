import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { lightBrand, darkBrand, createShadows, type BrandColors } from '../lib/themes';

export type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: BrandColors;
  shadows: ReturnType<typeof createShadows>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'kamjai.themeMode';
const DARK_START_HOUR = 19;
const DARK_END_HOUR = 7;

const resolveAutoMode = () => {
  const hour = new Date().getHours();
  return hour >= DARK_START_HOUR || hour < DARK_END_HOUR ? 'dark' : 'light';
};

const getInitialMode = (): ThemeMode => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  }
  return 'auto';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(mode === 'auto' ? resolveAutoMode() : mode);

  useEffect(() => {
    const updateResolved = () => {
      setResolved(mode === 'auto' ? resolveAutoMode() : mode);
    };
    updateResolved();
    if (mode !== 'auto') return;
    const id = setInterval(updateResolved, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const colors = resolved === 'dark' ? darkBrand : lightBrand;
  const shadows = useMemo(() => {
    const shadowRgb = resolved === 'dark' ? '155, 92, 255' : '27, 42, 107';
    const shadowColor = resolved === 'dark' ? darkBrand.shadow : lightBrand.shadow;
    return createShadows(shadowRgb, shadowColor);
  }, [resolved]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isDark: resolved === 'dark',
      colors,
      shadows,
    }),
    [mode, colors, shadows, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
