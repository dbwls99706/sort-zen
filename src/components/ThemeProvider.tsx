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
  tubeOutline: '#BCC2CC',
  tubeBackground: '#F5F5F5',
  // 초반 colorId(0~5)가 최대한 다른 색이 되도록 색상환에서 멀리 떨어진 순으로 배치한다.
  // (인접 유사색 — 살구/주황/노랑 — 이 연달아 나와 구별이 안 되던 문제 수정)
  colors: [
    '#FF8A8A', '#79D98E', '#7AA6F0', '#FFD36B',
    '#C58CE6', '#5FD3BE', '#FFAE7A', '#F58CC8',
    '#B6E07A', '#9D8CF0', '#6CC6EE', '#F2E96B',
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
    '#FF0080', '#00FF00', '#0080FF', '#FFFF00',
    '#8000FF', '#00FFFF', '#FF8000', '#FF00FF',
    '#80FF00', '#00FFAA', '#FF4040', '#FF0040',
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
    '#E94560', '#7ED321', '#4A90D9', '#F8E71C',
    '#BD10E0', '#50E3C2', '#F5A623', '#F6A1C4',
    '#9013FE', '#417505', '#B8E986', '#D0021B',
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
