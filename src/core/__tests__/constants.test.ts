import { DEFAULT_CAPACITY, MAX_COLORS, MIN_COLORS, DEFAULT_EMPTY_TUBES } from '../constants';

describe('constants', () => {
  test('DEFAULT_CAPACITY는 4이다', () => {
    expect(DEFAULT_CAPACITY).toBe(4);
  });

  test('색상 범위가 유효하다', () => {
    expect(MIN_COLORS).toBeLessThan(MAX_COLORS);
    expect(MIN_COLORS).toBeGreaterThanOrEqual(2);
  });

  test('기본 빈 튜브 수는 양수다', () => {
    expect(DEFAULT_EMPTY_TUBES).toBeGreaterThan(0);
  });
});
