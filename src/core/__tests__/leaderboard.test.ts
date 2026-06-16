import { levelToScore, isNewBest } from '../leaderboard';

describe('leaderboard score', () => {
  test('도달 단계를 그대로 정수 점수로 변환한다', () => {
    expect(levelToScore(1)).toBe(1);
    expect(levelToScore(42)).toBe(42);
    expect(levelToScore(500)).toBe(500);
  });

  test('소수 레벨은 내림 처리한다', () => {
    expect(levelToScore(7.9)).toBe(7);
  });

  test('0·음수·비정상 입력은 최소 1로 방어한다', () => {
    expect(levelToScore(0)).toBe(1);
    expect(levelToScore(-5)).toBe(1);
    expect(levelToScore(Number.NaN)).toBe(1);
    expect(levelToScore(Number.POSITIVE_INFINITY)).toBe(1);
  });

  test('isNewBest는 더 높은 단계에서만 true', () => {
    expect(isNewBest(10, 9)).toBe(true);
    expect(isNewBest(10, 10)).toBe(false);
    expect(isNewBest(10, 11)).toBe(false);
  });

  test('isNewBest는 비정상 입력을 방어한다', () => {
    expect(isNewBest(Number.NaN, 5)).toBe(false);
    expect(isNewBest(5, Number.NaN)).toBe(true);
  });
});
