import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'pastel' | 'neon' | 'dark';
type Language = 'ko' | 'en';

type SettingsState = {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  hapticEnabled: boolean;
  theme: Theme;
  language: Language;
  toggleSound: () => void;
  toggleBgm: () => void;
  toggleHaptic: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      bgmEnabled: true,
      hapticEnabled: true,
      theme: 'pastel' as Theme,
      language: 'ko' as Language,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleBgm: () => set((s) => ({ bgmEnabled: !s.bgmEnabled })),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'sortzen-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
