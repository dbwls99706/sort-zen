export const DEFAULT_CAPACITY = 4;
export const MAX_COLORS = 12;
export const MIN_COLORS = 3;
export const DEFAULT_EMPTY_TUBES = 2;

/**
 * 난이도 셔플 포화 캡 (T147) — 이 이상은 체감 난이도 증가 없이
 * 생성(솔버 검증) 지연만 키운다. 난이도는 색상 수로 조절한다.
 */
export const MAX_SHUFFLE_STEPS = 300;

/** 힌트 1회 코인 비용. 부족하면 리워드 광고로 대체 (T143) */
export const HINT_COST = 15;

/** 가려진 레이어(회색+?) 메커니즘이 처음 등장하는 클래식 레벨 */
export const HIDDEN_START_LEVEL = 10;
/** 가려진 레이어가 1칸씩 깊어지는 레벨 간격 (점진 난이도) */
export const HIDDEN_RAMP_LEVELS = 5;

/** 리워드 광고 1회 시청 보상 코인 (상점 '무료 코인'). 힌트 약 2회분 */
export const REWARDED_COIN_AMOUNT = 30;

/** 무브 효율 별점 기준 — 솔버 해 길이 대비 실제 이동 수 비율 (T145) */
export const STAR_3_MAX_RATIO = 1.0;
export const STAR_2_MAX_RATIO = 1.25;

/** 별점별 클리어 코인 보상 (T145) */
export const CLEAR_COIN_REWARD: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 15,
  3: 20,
};
