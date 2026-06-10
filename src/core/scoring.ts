import {
  STAR_3_MAX_RATIO,
  STAR_2_MAX_RATIO,
  CLEAR_COIN_REWARD,
} from './constants';

export type StarCount = 1 | 2 | 3;

/**
 * 무브 효율 별점 (T145). 솔버 해 길이(optimalMoves) 대비 실제 이동 수로 산정.
 * 솔버 해는 최단 보장이 없으므로 그 이하로 풀면 무조건 3별 (플레이어에게 관대).
 * 최적해를 모르면(null) 3별.
 */
export function calcStars(
  moveCount: number,
  optimalMoves: number | null,
): StarCount {
  if (optimalMoves === null || optimalMoves <= 0) return 3;
  if (moveCount <= optimalMoves * STAR_3_MAX_RATIO) return 3;
  if (moveCount <= optimalMoves * STAR_2_MAX_RATIO) return 2;
  return 1;
}

/** 별점에 따른 클리어 코인 보상 */
export function clearCoinReward(stars: StarCount): number {
  return CLEAR_COIN_REWARD[stars];
}
