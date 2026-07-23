// src/theme/tokens.ts
export type Theme = {
  mode: 'dark' | 'light';
  colors: {
    background: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  gradients: {
    screenBg: readonly [string, string];
    hero: readonly [string, string];
    card: readonly [string, string];
    group1: readonly [string, string];
    group2: readonly [string, string];
    group3: readonly [string, string];
    quick: readonly [string, string];
    flexible: readonly [string, string];
    moderate: readonly [string, string];
    longTerm: readonly [string, string];
    primaryButton: readonly [string, string];
  };
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0a0e1a',
    surface: '#141a2b',
    border: '#232b42',
    textPrimary: '#f5f7fa',
    textSecondary: '#8b93a7',
    textMuted: '#565f73',
  },
  gradients: {
    screenBg: ['#0a0e1a', '#0c1224'],
    hero: ['#1a2340', '#0f1729'],
    card: ['#171f36', '#121729'],
    group1: ['#34d399', '#059669'],
    group2: ['#60a5fa', '#4f46e5'],
    group3: ['#c4b5fd', '#8b5cf6'],
    quick: ['#34d399', '#0d9488'],
    flexible: ['#60a5fa', '#2563eb'],
    moderate: ['#fbbf24', '#d97706'],
    longTerm: ['#fb7185', '#e11d48'],
    primaryButton: ['#34d399', '#059669'],
  },
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#f4f6fb',
    surface: '#ffffff',
    border: '#e2e6f0',
    textPrimary: '#151a2c',
    textSecondary: '#5b6478',
    textMuted: '#9aa2b5',
  },
  gradients: {
    screenBg: ['#f4f6fb', '#eceffa'],
    hero: ['#e8ecfb', '#f6f8ff'],
    card: ['#ffffff', '#f7f9ff'],
    group1: ['#6ee7b7', '#10b981'],
    group2: ['#93c5fd', '#3b82f6'],
    group3: ['#ddd6fe', '#a78bfa'],
    quick: ['#6ee7b7', '#0d9488'],
    flexible: ['#93c5fd', '#2563eb'],
    moderate: ['#fde68a', '#d97706'],
    longTerm: ['#fda4af', '#e11d48'],
    primaryButton: ['#6ee7b7', '#10b981'],
  },
};