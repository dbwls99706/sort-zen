import { getDifficulty, getZenParams } from '../difficulty';
import {
  DEFAULT_CAPACITY,
  DEFAULT_EMPTY_TUBES,
  MAX_COLORS,
  MAX_SHUFFLE_STEPS,
} from '../constants';

describe('getDifficulty', () => {
  test('레벨 1은 3색으로 시작한다', () => {
    const params = getDifficulty(1);
    expect(params.colors).toBe(3);
    expect(params.filledTubes).toBe(3);
  });

  test('레벨이 올라갈수록 색상이 증가한다', () => {
    const low = getDifficulty(10);
    const high = getDifficulty(200);
    expect(high.colors).toBeGreaterThan(low.colors);
  });

  test('색상은 MAX_COLORS를 넘지 않는다', () => {
    const params = getDifficulty(9999);
    expect(params.colors).toBeLessThanOrEqual(MAX_COLORS);
  });

  test('용량은 항상 DEFAULT_CAPACITY이다', () => {
    const params = getDifficulty(50);
    expect(params.capacity).toBe(DEFAULT_CAPACITY);
  });

  test('빈 튜브는 모든 레벨에서 최소 2개다 (T147 — 솔버블 보장)', () => {
    for (const level of [1, 50, 100, 150, 300, 9999]) {
      expect(getDifficulty(level).emptyTubes).toBe(DEFAULT_EMPTY_TUBES);
    }
  });

  test('shuffleSteps는 레벨에 비례한다', () => {
    const low = getDifficulty(10);
    const high = getDifficulty(100);
    expect(high.shuffleSteps).toBeGreaterThan(low.shuffleSteps);
  });

  test('shuffleSteps는 포화 캡을 넘지 않는다 (T147 — 생성 지연 방지)', () => {
    expect(getDifficulty(9999).shuffleSteps).toBe(MAX_SHUFFLE_STEPS);
  });
});

describe('getZenParams', () => {
  test('색상은 5~9 범위이다', () => {
    for (let i = 0; i < 20; i++) {
      const params = getZenParams();
      expect(params.colors).toBeGreaterThanOrEqual(5);
      expect(params.colors).toBeLessThanOrEqual(9);
    }
  });

  test('빈 튜브는 항상 2개이다', () => {
    const params = getZenParams();
    expect(params.emptyTubes).toBe(2);
  });

  test('용량은 DEFAULT_CAPACITY이다', () => {
    const params = getZenParams();
    expect(params.capacity).toBe(DEFAULT_CAPACITY);
  });
});
