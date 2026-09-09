import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';

import { THEMES, type ThemeColors } from '../theme/colors';

const ThemeContext = createContext<ThemeColors>(THEMES.pastel);
export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = useMemo(() => THEMES[theme], [theme]);
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}
