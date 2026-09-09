import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';

type ThemeName = 'pastel' | 'neon' | 'dark';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  success: string;
  hero: string;
  tubeOutline: string;
  tubeBackground: string;
  colors: string[];
};

const PASTEL_COLORS: ThemeColors = {
  background: '#F7F4EC',
  surface: '#FFFEFA',
  surfaceMuted: '#EEEDE4',
  border: '#DEDFD4',
  text: '#243F3C',
  textSecondary: '#697873',
  accent: '#28675F',
  accentText: '#FFFFFF',
  accentSoft: '#E0ECE4',
  success: '#38745B',
  hero: '#E8ECE2',
  tubeOutline: '#8FA7A1',
  tubeBackground: '#EDF1E9',
  // Keep early colors well separated; shared labels also identify liquid without color.
  colors: [
    '#EF8585',
    '#78BB86',
    '#769DE2',
    '#ECC466',
    '#BA8AD6',
    '#57BCAF',
    '#E9A275',
    '#DF86B5',
    '#A9C969',
    '#9583D1',
    '#6AB8D0',
    '#D7CE63',
  ],
};

const NEON_COLORS: ThemeColors = {
  background: '#101326',
  surface: '#1C2239',
  surfaceMuted: '#272E47',
  border: '#3A4661',
  text: '#F3F7FF',
  textSecondary: '#A5B3CC',
  accent: '#147969',
  accentText: '#FFFFFF',
  accentSoft: '#203E40',
  success: '#70E1AD',
  hero: '#222B45',
  tubeOutline: '#6A82A6',
  tubeBackground: '#182137',
  colors: [
    '#FF579E',
    '#69E68A',
    '#619FFF',
    '#FFE467',
    '#BB86FF',
    '#59E1D6',
    '#FFA663',
    '#F28EE1',
    '#BFE769',
    '#9093FF',
    '#69D3F3',
    '#EBC081',
  ],
};

const DARK_COLORS: ThemeColors = {
  background: '#172725',
  surface: '#243633',
  surfaceMuted: '#2E413D',
  border: '#435952',
  text: '#F1F3E9',
  textSecondary: '#AFBEB5',
  accent: '#34776A',
  accentText: '#FFFFFF',
  accentSoft: '#2C4840',
  success: '#ACD3A7',
  hero: '#2A4038',
  tubeOutline: '#728F84',
  tubeBackground: '#1E332D',
  colors: [
    '#F19595',
    '#8CC792',
    '#8CAFE9',
    '#E9C675',
    '#BD9CDC',
    '#7EC7BD',
    '#E4AE87',
    '#DEA1C7',
    '#B2CD83',
    '#A398D9',
    '#86BED2',
    '#D8CF90',
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
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}
