import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';

type ThemeName = 'pastel' | 'neon' | 'dark';

type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  tubeOutline: string;
  tubeBackground: string;
  colors: string[];
};

const PASTEL_COLORS: ThemeColors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#888888',
  accent: '#FF9A76',
  tubeOutline: '#CCCCCC',
  tubeBackground: '#F5F5F5',
  colors: [
    '#FF9A9E', '#FAD0C4', '#A1C4FD', '#C2E9FB',
    '#D4FC79', '#96E6A1', '#FFECD2', '#FCB69F',
    '#A18CD1', '#FBC2EB', '#84FAB0', '#FFD1FF',
  ],
};

const NEON_COLORS: ThemeColors = {
  background: '#0A0A2A',
  surface: '#1A1A3A',
  text: '#FFFFFF',
  textSecondary: '#AAAACC',
  accent: '#00FFAA',
  tubeOutline: '#4444AA',
  tubeBackground: '#12122A',
  colors: [
    '#FF0080', '#FF4040', '#FF8000', '#FFFF00',
    '#00FF00', '#00FFAA', '#00FFFF', '#0080FF',
    '#8000FF', '#FF00FF', '#FF0040', '#80FF00',
  ],
};

const DARK_COLORS: ThemeColors = {
  background: '#1A1A2E',
  surface: '#16213E',
  text: '#E0E0E0',
  textSecondary: '#888888',
  accent: '#E94560',
  tubeOutline: '#333355',
  tubeBackground: '#0F3460',
  colors: [
    '#E94560', '#F5A623', '#7ED321', '#4A90D9',
    '#BD10E0', '#50E3C2', '#F8E71C', '#D0021B',
    '#9013FE', '#417505', '#B8E986', '#F6A1C4',
  ],
};

const THEMES: Record<ThemeName, ThemeColors> = {
  pastel: PASTEL_COLORS,
  neon: NEON_COLORS,
  dark: DARK_COLORS,
};

const ThemeContext = createContext<ThemeColors>(PASTEL_COLORS);

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = useMemo(() => THEMES[theme], [theme]);

  return (
    <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
  );
}
