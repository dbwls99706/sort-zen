import { getDifficulty, getZenParams } from '../difficulty';
import {
  DEFAULT_CAPACITY,
  DEFAULT_EMPTY_TUBES,
  MAX_COLORS,
  MIN_COLORS,
  MAX_SHUFFLE_STEPS,
} from '../constants';

// 난이도는 스테이지에 비례 증가하지 않고 매 판 랜덤화된다(사용자 요청).
// 따라서 단조 증가가 아니라 "유효 범위 + 무작위성"을 검증한다.
describe('getDifficulty (랜덤 난이도)', () => {
  test('색상 수는 4 ~ MAX_COLORS 범위이고 filledTubes와 일치한다', () => {
    for (let i = 0; i < 100; i++) {
      const p = getDifficulty(1 + i);
      expect(p.colors).toBeGreaterThanOrEqual(MIN_COLORS + 1);
      expect(p.colors).toBeLessThanOrEqual(MAX_COLORS);
      expect(p.filledTubes).toBe(p.colors);
    }
  });

  test('난이도가 레벨에 묶이지 않고 무작위다 (같은 레벨도 매번 다름)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) seen.add(getDifficulty(5).colors);
    expect(seen.size).toBeGreaterThan(1);
  });

  test('빈 튜브는 최소 2개이며 가끔 3개로 변주된다', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const e = getDifficulty(1).emptyTubes;
      expect(e).toBeGreaterThanOrEqual(DEFAULT_EMPTY_TUBES);
      expect(e).toBeLessThanOrEqual(DEFAULT_EMPTY_TUBES + 1);
      counts.add(e);
    }
    expect(counts.size).toBeGreaterThan(1); // 2와 3 모두 등장
  });

  test('용량은 항상 DEFAULT_CAPACITY이다', () => {
    expect(getDifficulty(50).capacity).toBe(DEFAULT_CAPACITY);
  });

  test('shuffleSteps는 양수이고 포화 캡을 넘지 않는다', () => {
    for (let i = 0; i < 100; i++) {
      const s = getDifficulty(1 + i).shuffleSteps;
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(MAX_SHUFFLE_STEPS);
    }
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
