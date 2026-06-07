import { computeTubeScale } from '../layout';

describe('computeTubeScale', () => {
  test('충분히 넓으면 스케일 1', () => {
    expect(computeTubeScale(4, 2000, 2000)).toBe(1);
  });

  test('튜브가 많고 공간이 좁으면 1보다 작게 축소', () => {
    const s = computeTubeScale(14, 360, 420);
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThanOrEqual(0.5);
  });

  test('튜브가 많을수록 스케일이 같거나 더 작아진다(단조)', () => {
    const few = computeTubeScale(6, 360, 500);
    const many = computeTubeScale(14, 360, 500);
    expect(many).toBeLessThanOrEqual(few);
  });

  test('비정상 입력은 1을 반환', () => {
    expect(computeTubeScale(0, 360, 500)).toBe(1);
    expect(computeTubeScale(8, 0, 500)).toBe(1);
  });
});
