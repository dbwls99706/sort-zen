import { generateLevel, GenParams } from '../generator';
import { getDifficulty } from '../difficulty';
import { isSolvable } from '../solver';
import { DEFAULT_CAPACITY } from '../constants';

function makeParams(overrides: Partial<GenParams> = {}): GenParams {
  return {
    colors: 4,
    filledTubes: 4,
    emptyTubes: 2,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps: 20,
    seed: 'test-seed',
    ...overrides,
  };
}

describe('generator', () => {
  test('생성된 보드의 총 레이어 수가 filledTubes × capacity와 같다', () => {
    const params = makeParams({ colors: 5, filledTubes: 5 });
    const tubes = generateLevel(params);
    const total = tubes.reduce((s, t) => s + t.layers.length, 0);
    expect(total).toBe(params.filledTubes * params.capacity);
  });

  test('각 색상은 정확히 capacity개만큼 존재한다', () => {
    const params = makeParams({ colors: 4, filledTubes: 4 });
    const tubes = generateLevel(params);
    const counts: Record<number, number> = {};
    tubes.forEach((t) =>
      t.layers.forEach((c) => (counts[c] = (counts[c] || 0) + 1)),
    );
    Object.values(counts).forEach((n) => expect(n).toBe(params.capacity));
  });

  test('동일 시드는 동일 보드를 생성한다', () => {
    const params = makeParams({ seed: 'fixed-seed' });
    const a = generateLevel(params);
    const b = generateLevel(params);
    expect(a).toEqual(b);
  });

  test('다른 시드는 다른 보드를 생성한다', () => {
    const paramsA = makeParams({ seed: 'seed-a' });
    const paramsB = makeParams({ seed: 'seed-b' });
    const a = generateLevel(paramsA);
    const b = generateLevel(paramsB);
    const layersA = a.map((t) => t.layers);
    const layersB = b.map((t) => t.layers);
    expect(layersA).not.toEqual(layersB);
  });

  test('빈 튜브 수가 정확하다', () => {
    const params = makeParams({ emptyTubes: 2, filledTubes: 4 });
    const tubes = generateLevel(params);
    expect(tubes.length).toBe(6);
  });

  test('튜브 용량을 초과하지 않는다', () => {
    const params = makeParams();
    const tubes = generateLevel(params);
    tubes.forEach((t) => {
      expect(t.layers.length).toBeLessThanOrEqual(t.capacity);
    });
  });

  test('getDifficulty로 생성해도 색상 보존된다', () => {
    const params = { ...getDifficulty(50), seed: 'stable-seed' };
    const tubes = generateLevel(params);
    const total = tubes.reduce((s, t) => s + t.layers.length, 0);
    expect(total).toBe(params.filledTubes * params.capacity);
  });

  // T141: 솔버블 검증 게이트 — 빈튜브 1개로 비-솔버블이던 고레벨도 보장
  test('모든 난이도 레벨이 솔버블한 보드를 생성한다', () => {
    for (const level of [1, 30, 60, 100, 120, 150, 200]) {
      const params = { ...getDifficulty(level), seed: `gate-${level}` };
      const tubes = generateLevel(params);
      expect(isSolvable(tubes)).toBe(true);
    }
  });

  // 단색 튜브 재시도 경로가 seedRetry 예산으로 제한되어 무한 재귀하지 않는다.
  // 작은 보드 + 높은 셔플은 단색 튜브가 자주 남아 재시도 경로를 탄다.
  test('많은 시드에서 항상 종료하고 솔버블 보드를 반환한다 (재귀 무한루프 회귀)', () => {
    for (let i = 0; i < 100; i++) {
      const params = makeParams({
        colors: 3,
        filledTubes: 3,
        emptyTubes: 2,
        shuffleSteps: 40,
        seed: `recur-${i}`,
      });
      const tubes = generateLevel(params);
      const total = tubes.reduce((s, t) => s + t.layers.length, 0);
      expect(total).toBe(params.filledTubes * params.capacity);
      expect(isSolvable(tubes)).toBe(true);
    }
  });

  test('빈튜브 보강 fallback 후에도 색상은 capacity개로 보존된다', () => {
    // 레벨 150은 빈튜브 1개로 사실상 항상 비-솔버블 → fallback 경로를 탄다
    const params = { ...getDifficulty(150), seed: 'fallback-150' };
    const tubes = generateLevel(params);
    const counts: Record<number, number> = {};
    tubes.forEach((t) =>
      t.layers.forEach((c) => (counts[c] = (counts[c] || 0) + 1)),
    );
    Object.values(counts).forEach((n) => expect(n).toBe(params.capacity));
    expect(isSolvable(tubes)).toBe(true);
  });
});
