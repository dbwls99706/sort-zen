import { calcStars, clearCoinReward } from '../scoring';
import {
  STAR_2_MAX_RATIO,
  CLEAR_COIN_REWARD,
} from '../constants';

describe('calcStars (무브 효율 별점 T145)', () => {
  test('최적해 이하로 풀면 3별', () => {
    expect(calcStars(20, 20)).toBe(3);
    expect(calcStars(15, 20)).toBe(3);
  });

  test('최적해의 25% 초과분 이내면 2별', () => {
    expect(calcStars(21, 20)).toBe(2);
    expect(calcStars(Math.floor(20 * STAR_2_MAX_RATIO), 20)).toBe(2);
  });

  test('그 이상이면 1별', () => {
    expect(calcStars(26, 20)).toBe(1);
    expect(calcStars(100, 20)).toBe(1);
  });

  test('최적해를 모르면(null/0) 관대하게 3별', () => {
    expect(calcStars(50, null)).toBe(3);
    expect(calcStars(50, 0)).toBe(3);
  });
});

describe('clearCoinReward', () => {
  test('별점별 코인 보상 매핑', () => {
    expect(clearCoinReward(1)).toBe(CLEAR_COIN_REWARD[1]);
    expect(clearCoinReward(2)).toBe(CLEAR_COIN_REWARD[2]);
    expect(clearCoinReward(3)).toBe(CLEAR_COIN_REWARD[3]);
  });

  test('별이 많을수록 보상이 크다', () => {
    expect(clearCoinReward(3)).toBeGreaterThan(clearCoinReward(2));
    expect(clearCoinReward(2)).toBeGreaterThan(clearCoinReward(1));
  });
});
