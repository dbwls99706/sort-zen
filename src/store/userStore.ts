import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PremiumType = 'none' | 'subscription' | 'lifetime';

type UserState = {
  coins: number;
  level: number;
  isPremium: boolean;
  premiumType: PremiumType;
  totalPlayTime: number;
  totalCleared: number;
  googleSignedIn: boolean;
  googlePlayerName: string | null;
  setGoogleAuth: (signedIn: boolean, name: string | null) => void;
  setPremium: (v: boolean, type: 'subscription' | 'lifetime') => void;
  spendCoins: (n: number) => boolean;
  addCoins: (n: number) => void;
  incrementLevel: () => void;
  addPlayTime: (seconds: number) => void;
  incrementCleared: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      coins: 100,
      level: 1,
      isPremium: false,
      premiumType: 'none' as PremiumType,
      totalPlayTime: 0,
      totalCleared: 0,
      googleSignedIn: false,
      googlePlayerName: null,

      setGoogleAuth: (signedIn, name) =>
        set({ googleSignedIn: signedIn, googlePlayerName: signedIn ? name : null }),

      setPremium: (v, type) =>
        set({ isPremium: v, premiumType: v ? type : 'none' }),

      spendCoins: (n) => {
        if (get().coins < n) return false;
        set((s) => ({ coins: s.coins - n }));
        return true;
      },

      addCoins: (n) => set((s) => ({ coins: s.coins + n })),

      incrementLevel: () => set((s) => ({ level: s.level + 1 })),

      addPlayTime: (seconds) =>
        set((s) => ({ totalPlayTime: s.totalPlayTime + seconds })),

      incrementCleared: () =>
        set((s) => ({ totalCleared: s.totalCleared + 1 })),
    }),
    {
      name: 'sortzen-user',
      version: 2,
      // v2: googleSignedIn/googlePlayerName 추가. 구버전엔 없으므로 기본값 보강.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<UserState>;
        return {
          ...p,
          googleSignedIn: p.googleSignedIn ?? false,
          googlePlayerName: p.googlePlayerName ?? null,
        } as UserState;
      },
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
