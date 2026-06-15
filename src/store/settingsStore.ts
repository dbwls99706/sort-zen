import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'pastel' | 'neon' | 'dark';
type Language = 'ko' | 'en';

type SettingsState = {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  hapticEnabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  theme: Theme;
  language: Language;
  hasSeenOnboarding: boolean;
  toggleSound: () => void;
  toggleBgm: () => void;
  toggleHaptic: () => void;
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setBgmVolume: (v: number) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  completeOnboarding: () => void;
};

const clampVolume = (v: number): number => Math.max(0, Math.min(1, v));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      bgmEnabled: true,
      hapticEnabled: true,
      masterVolume: 1,
      sfxVolume: 0.8,
      bgmVolume: 0.5,
      theme: 'pastel' as Theme,
      language: 'ko' as Language,
      hasSeenOnboarding: false,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleBgm: () => set((s) => ({ bgmEnabled: !s.bgmEnabled })),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setMasterVolume: (v) => set({ masterVolume: clampVolume(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clampVolume(v) }),
      setBgmVolume: (v) => set({ bgmVolume: clampVolume(v) }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: 'sortzen-settings',
      version: 1,
      // v1 기준선. 이후 스키마 변경 시 version을 올리고 oldVersion으로 분기한다.
      migrate: (persisted) => persisted as SettingsState,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
