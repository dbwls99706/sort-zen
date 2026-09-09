import { generateLevel, generateLevelWithSolution, GenParams } from '../generator';
import { getDifficulty } from '../difficulty';
import { isSolvable } from '../solver';
import { isTubeComplete, pour, isCleared } from '../rules';
import { DEFAULT_CAPACITY, MAX_SHUFFLE_STEPS } from '../constants';

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
    tubes.forEach((t) => t.layers.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
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

  // Every generated difficulty retains a playable solution.
  test('모든 난이도 레벨이 솔버블한 보드를 생성한다', () => {
    for (const level of [1, 30, 60, 100, 120, 150, 200]) {
      const params = { ...getDifficulty(level), seed: `gate-${level}` };
      const tubes = generateLevel(params);
      expect(isSolvable(tubes)).toBe(true);
    }
  });

  // Regression coverage for the formerly recursive generator.
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

  // 버그 리포트: 한 색이 가득 채워진(=이미 완성) 튜브가 시작 보드에 나오던 문제.
  // 충분한 셔플에서 시작 보드에 완성 튜브가 하나도 없어야 한다.
  test('시작 보드에 완성(가득 단색) 튜브가 없다', () => {
    for (let i = 0; i < 60; i++) {
      const params = makeParams({
        colors: 5,
        filledTubes: 5,
        emptyTubes: 2,
        shuffleSteps: 50,
        seed: `mono-${i}`,
      });
      const tubes = generateLevel(params);
      expect(tubes.some((t) => isTubeComplete(t))).toBe(false);
    }
  });

  test('높은 레벨에서도 색상과 풀 수 있는 보드를 보존한다', () => {
    const params = { ...getDifficulty(150), seed: 'fallback-150' };
    const tubes = generateLevel(params);
    const counts: Record<number, number> = {};
    tubes.forEach((t) => t.layers.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
    Object.values(counts).forEach((n) => expect(n).toBe(params.capacity));
    expect(isSolvable(tubes)).toBe(true);
  });
});

describe('bounded constructive generation', () => {
  test('generated solution replays exact legal pours across capacities and tube counts', () => {
    for (const capacity of [2, 3, 4, 5]) {
      for (const colors of [3, 6, 9, 12]) {
        for (const emptyTubes of [1, 2, 3]) {
          for (let seed = 0; seed < 4; seed++) {
            const { tubes, solution } = generateLevelWithSolution(
              makeParams({
                colors,
                filledTubes: colors,
                capacity,
                emptyTubes,
                shuffleSteps: colors * 12,
                seed: `replay-${capacity}-${colors}-${emptyTubes}-${seed}`,
              }),
            );
            let current = tubes;
            for (const move of solution) {
              const from = current.find((tube) => tube.id === move.from)!;
              const to = current.find((tube) => tube.id === move.to)!;
              const result = pour(from, to);
              expect(result?.move).toEqual(move);
              current = current.map((tube) =>
                tube.id === from.id ? result!.from : tube.id === to.id ? result!.to : tube,
              );
            }
            expect(isCleared(current)).toBe(true);
            expect(tubes).toHaveLength(colors + emptyTubes);
            expect(tubes.every((tube) => tube.layers.length <= capacity)).toBe(true);
          }
        }
      }
    }
  });

  test('extreme shuffle requests have the same bounded work as the configured cap', () => {
    const params = makeParams({ colors: 12, filledTubes: 12, seed: 'bounded' });
    expect(generateLevelWithSolution({ ...params, shuffleSteps: 1_000_000_000 })).toEqual(
      generateLevelWithSolution({ ...params, shuffleSteps: MAX_SHUFFLE_STEPS }),
    );
  });

  test('zero shuffle returns a solved board and empty solution', () => {
    const generated = generateLevelWithSolution(makeParams({ shuffleSteps: 0 }));
    expect(isCleared(generated.tubes)).toBe(true);
    expect(generated.solution).toEqual([]);
  });
});
