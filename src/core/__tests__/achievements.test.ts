import {
  ACHIEVEMENTS,
  evaluateUnlocked,
  achievementProgress,
  getAchievement,
  isUnlocked,
  AchievementStats,
} from '../achievements';

const ZERO: AchievementStats = {
  levelsCleared: 0,
  totalPours: 0,
  zenCleared: 0,
  dailyStreak: 0,
  coins: 0,
};

describe('achievements', () => {
  test('모든 도전과제 id는 유일하다', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('같은 metric의 threshold는 오름차순이다', () => {
    const metrics = new Set(ACHIEVEMENTS.map((a) => a.metric));
    for (const m of metrics) {
      const ts = ACHIEVEMENTS.filter((a) => a.metric === m).map((a) => a.threshold);
      const sorted = [...ts].sort((x, y) => x - y);
      expect(ts).toEqual(sorted);
    }
  });

  test('통계 0이면 아무것도 해제되지 않는다', () => {
    expect(evaluateUnlocked(ZERO)).toEqual([]);
  });

  test('threshold 도달 시 해당 도전과제가 해제된다', () => {
    const unlocked = evaluateUnlocked({ ...ZERO, levelsCleared: 25 });
    expect(unlocked).toContain('levelsCleared_1');
    expect(unlocked).toContain('levelsCleared_2');
    expect(unlocked).not.toContain('levelsCleared_3');
  });

  test('isUnlocked는 임계값 미만에서 false', () => {
    const a = getAchievement('totalPours_2')!;
    expect(a.threshold).toBe(1000);
    expect(isUnlocked(a, { ...ZERO, totalPours: 999 })).toBe(false);
    expect(isUnlocked(a, { ...ZERO, totalPours: 1000 })).toBe(true);
  });

  test('achievementProgress 비율은 0~1로 클램프된다', () => {
    const a = getAchievement('levelsCleared_2')!; // threshold 25
    expect(achievementProgress(a, { ...ZERO, levelsCleared: 0 }).ratio).toBe(0);
    expect(achievementProgress(a, { ...ZERO, levelsCleared: 5 }).ratio).toBeCloseTo(0.2);
    expect(achievementProgress(a, { ...ZERO, levelsCleared: 999 }).ratio).toBe(1);
  });

  test('getAchievement는 없는 id에 undefined', () => {
    expect(getAchievement('nope')).toBeUndefined();
  });
});
