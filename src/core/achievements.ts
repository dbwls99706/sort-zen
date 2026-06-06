// 컬렉션 도전과제 — 누적 진행에 대한 영구 잠금 해제 목표.
// 순수 정의 + 평가 함수만 둔다 (UI/스토어와 분리, 단위 테스트 대상).

export type AchievementMetric =
  | 'levelsCleared'
  | 'totalPours'
  | 'zenCleared'
  | 'dailyStreak'
  | 'coins';

export type AchievementStats = Record<AchievementMetric, number>;

export type Achievement = {
  id: string;
  metric: AchievementMetric;
  tier: number; // 1-base
  threshold: number;
  reward: number; // 잠금 해제 시 지급 코인
  icon: string;
};

type MetricConfig = {
  icon: string;
  // [threshold, reward] 오름차순
  steps: [number, number][];
};

const METRIC_CONFIG: Record<AchievementMetric, MetricConfig> = {
  levelsCleared: { icon: '🌱', steps: [[1, 50], [25, 100], [100, 200], [300, 500]] },
  totalPours: { icon: '💧', steps: [[100, 50], [1000, 150], [10000, 400]] },
  zenCleared: { icon: '🧘', steps: [[10, 50], [50, 150], [200, 400]] },
  dailyStreak: { icon: '🔥', steps: [[3, 100], [7, 200], [30, 500]] },
  coins: { icon: '🪙', steps: [[500, 50], [3000, 100], [10000, 200]] },
};

export const ACHIEVEMENT_METRICS = Object.keys(METRIC_CONFIG) as AchievementMetric[];

export const ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_METRICS.flatMap((metric) =>
  METRIC_CONFIG[metric].steps.map(([threshold, reward], i) => ({
    id: `${metric}_${i + 1}`,
    metric,
    tier: i + 1,
    threshold,
    reward,
    icon: METRIC_CONFIG[metric].icon,
  })),
);

const BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID[id];
}

export function isUnlocked(a: Achievement, stats: AchievementStats): boolean {
  return stats[a.metric] >= a.threshold;
}

/** 현재 통계 기준 잠금 해제된 도전과제 id 목록. */
export function evaluateUnlocked(stats: AchievementStats): string[] {
  return ACHIEVEMENTS.filter((a) => isUnlocked(a, stats)).map((a) => a.id);
}

/** 진행률(0~1) + 현재/목표 값. UI 진행 바에 사용. */
export function achievementProgress(
  a: Achievement,
  stats: AchievementStats,
): { current: number; threshold: number; ratio: number } {
  const current = stats[a.metric];
  const ratio = Math.max(0, Math.min(1, current / a.threshold));
  return { current, threshold: a.threshold, ratio };
}
