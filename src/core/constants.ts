export const DEFAULT_CAPACITY = 4;
export const MAX_COLORS = 12;
export const MIN_COLORS = 3;
export const DEFAULT_EMPTY_TUBES = 2;

/** 힌트 1회 코인 비용. 부족하면 리워드 광고로 대체 (T143) */
export const HINT_COST = 15;

/** 무브 효율 별점 기준 — 솔버 해 길이 대비 실제 이동 수 비율 (T145) */
export const STAR_3_MAX_RATIO = 1.0;
export const STAR_2_MAX_RATIO = 1.25;

/** 별점별 클리어 코인 보상 (T145) */
export const CLEAR_COIN_REWARD: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 15,
  3: 20,
};
