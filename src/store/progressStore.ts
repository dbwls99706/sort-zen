import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from './userStore';
import {
  AchievementStats,
  evaluateUnlocked,
  getAchievement,
} from '../core/achievements';
import {
  DailyChallenge,
  DailyChallengeType,
  DailyEvent,
  dailyEventDelta,
  generateDailyChallenge,
  isNextDay,
  toDateKey,
} from '../core/dailyChallenge';

type DailyState = {
  date: string;
  type: DailyChallengeType;
  goal: number;
  reward: number;
  movesLimit: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

type ProgressState = {
  totalPours: number;
  zenCleared: number;
  dailyStreak: number;
  lastDailyCompletedDate: string | null;
  unlocked: string[];
  recentUnlocks: string[];
  daily: DailyState | null;

  ensureDaily: (now?: Date) => void;
  recordPour: (now?: Date) => void;
  recordClear: (meta: { mode: 'classic' | 'zen'; moveCount: number }, now?: Date) => void;
  claimDaily: (now?: Date) => boolean;
  syncAchievements: () => string[];
  clearRecentUnlocks: () => void;
  getStats: () => AchievementStats;
};

function challengeOf(d: DailyState): DailyChallenge {
  return { type: d.type, goal: d.goal, reward: d.reward, movesLimit: d.movesLimit };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      totalPours: 0,
      zenCleared: 0,
      dailyStreak: 0,
      lastDailyCompletedDate: null,
      unlocked: [],
      recentUnlocks: [],
      daily: null,

      getStats: () => {
        const u = useUserStore.getState();
        return {
          levelsCleared: u.totalCleared,
          totalPours: get().totalPours,
          zenCleared: get().zenCleared,
          dailyStreak: get().dailyStreak,
          coins: u.coins,
        };
      },

      ensureDaily: (now = new Date()) => {
        const key = toDateKey(now);
        const cur = get().daily;
        if (cur && cur.date === key) return;

        // 연속 완료가 끊겼으면 스트릭 리셋
        const last = get().lastDailyCompletedDate;
        const brokeStreak = last !== null && last !== key && !isNextDay(last, key);

        const c = generateDailyChallenge(key);
        set({
          daily: {
            date: key,
            type: c.type,
            goal: c.goal,
            reward: c.reward,
            movesLimit: c.movesLimit,
            progress: 0,
            completed: false,
            claimed: false,
          },
          dailyStreak: brokeStreak ? 0 : get().dailyStreak,
        });
      },

      recordPour: (now = new Date()) => {
        get().ensureDaily(now);
        set((s) => ({ totalPours: s.totalPours + 1 }));
        applyDailyEvent(set, get, { kind: 'pour' });
        get().syncAchievements();
      },

      recordClear: (meta, now = new Date()) => {
        get().ensureDaily(now);
        if (meta.mode === 'zen') {
          set((s) => ({ zenCleared: s.zenCleared + 1 }));
        }
        applyDailyEvent(set, get, { kind: 'clear', moveCount: meta.moveCount });
        get().syncAchievements();
      },

      claimDaily: (now = new Date()) => {
        get().ensureDaily(now);
        const d = get().daily;
        if (!d || !d.completed || d.claimed) return false;

        useUserStore.getState().addCoins(d.reward);

        const last = get().lastDailyCompletedDate;
        const newStreak = last && isNextDay(last, d.date) ? get().dailyStreak + 1 : 1;

        set({
          daily: { ...d, claimed: true },
          dailyStreak: newStreak,
          lastDailyCompletedDate: d.date,
        });
        get().syncAchievements();
        return true;
      },

      syncAchievements: () => {
        const stats = get().getStats();
        const unlockedNow = evaluateUnlocked(stats);
        const prev = get().unlocked;
        const fresh = unlockedNow.filter((id) => !prev.includes(id));

        if (fresh.length > 0) {
          const reward = fresh.reduce(
            (sum, id) => sum + (getAchievement(id)?.reward ?? 0),
            0,
          );
          if (reward > 0) useUserStore.getState().addCoins(reward);
          set({
            unlocked: unlockedNow,
            recentUnlocks: [...get().recentUnlocks, ...fresh],
          });
        } else if (unlockedNow.length !== prev.length) {
          set({ unlocked: unlockedNow });
        }
        return fresh;
      },

      clearRecentUnlocks: () => set({ recentUnlocks: [] }),
    }),
    {
      name: 'sortzen-progress',
      version: 1,
      // v1 기준선. 이후 스키마 변경 시 version을 올리고 oldVersion으로 분기한다.
      migrate: (persisted) => persisted as ProgressState,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type SetFn = (partial: Partial<ProgressState>) => void;
type GetFn = () => ProgressState;

function applyDailyEvent(set: SetFn, get: GetFn, e: DailyEvent): void {
  const d = get().daily;
  if (!d || d.completed) return;
  const delta = dailyEventDelta(challengeOf(d), e);
  if (delta <= 0) return;
  const progress = Math.min(d.goal, d.progress + delta);
  set({ daily: { ...d, progress, completed: progress >= d.goal } });
}
