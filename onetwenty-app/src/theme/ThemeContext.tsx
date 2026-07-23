// src/theme/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from './tokens';

const STORAGE_KEY = 'onetwenty-theme-preference';

type ThemeContextValue = { theme: Theme; toggleTheme: () => void; loaded: boolean };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<'dark' | 'light'>(systemScheme === 'light' ? 'light' : 'dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
      setLoaded(true);
    });
  }, []);

  function toggleTheme() {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={{ theme, toggleTheme, loaded }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}