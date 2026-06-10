import seedrandom from 'seedrandom';
import { Tube, ColorId } from './types';
import { isSolvable } from './solver';

export type GenParams = {
  colors: number;
  filledTubes: number;
  emptyTubes: number;
  capacity: number;
  shuffleSteps: number;
  seed: string;
};

/**
 * 같은 난이도에서 다른 시드로 재생성을 시도하는 최대 횟수.
 * 초과 시 빈 튜브를 보강해 솔버블을 구조적으로 보장한다.
 */
const MAX_SEED_RETRIES = 3;

export function generateLevel(params: GenParams, seedRetry = 0): Tube[] {
  const { filledTubes, emptyTubes, capacity, shuffleSteps, seed } = params;
  const rng = seedrandom(seed);

  const tubes: Tube[] = [];
  for (let c = 0; c < filledTubes; c++) {
    tubes.push({
      id: c,
      capacity,
      layers: Array<ColorId>(capacity).fill(c),
    });
  }
  for (let e = 0; e < emptyTubes; e++) {
    tubes.push({ id: filledTubes + e, capacity, layers: [] });
  }

  let attempts = 0;
  let success = 0;
  const maxAttempts = shuffleSteps * 10;

  while (success < shuffleSteps && attempts < maxAttempts) {
    attempts++;
    const fromIdx = Math.floor(rng() * tubes.length);
    const toIdx = Math.floor(rng() * tubes.length);
    if (fromIdx === toIdx) continue;

    const result = forcedPour(tubes[fromIdx], tubes[toIdx]);
    if (result) {
      tubes[fromIdx] = result.from;
      tubes[toIdx] = result.to;
      success++;
    }
  }

  const monochromeCount = tubes.filter(
    (t) =>
      t.layers.length === capacity &&
      t.layers.every((l) => l === t.layers[0]),
  ).length;
  if (monochromeCount >= 2 && shuffleSteps > 10) {
    return generateLevel({ ...params, seed: seed + '_r' }, seedRetry);
  }

  // 솔버블 검증 게이트 — SPEC §8 "생성기가 항상 풀리는 보드 보장".
  // 역방향 셔플은 빈 튜브가 부족하면 비-솔버블 보드를 만들 수 있으므로,
  // 다른 시드로 몇 번 재시도하고, 그래도 실패하면 작업 공간(빈 튜브)을
  // 보강한다. 빈 튜브가 늘면 솔버블이 보장되므로 재귀는 반드시 수렴한다.
  if (!isSolvable(tubes)) {
    if (seedRetry < MAX_SEED_RETRIES) {
      return generateLevel(
        { ...params, seed: `${seed}_s${seedRetry}` },
        seedRetry + 1,
      );
    }
    return generateLevel(
      { ...params, emptyTubes: emptyTubes + 1, seed: `${seed}_e` },
      0,
    );
  }

  return tubes;
}

function forcedPour(
  from: Tube,
  to: Tube,
): { from: Tube; to: Tube } | null {
  if (from.layers.length === 0) return null;
  if (to.layers.length >= to.capacity) return null;
  const color = from.layers[from.layers.length - 1];
  return {
    from: { ...from, layers: from.layers.slice(0, -1) },
    to: { ...to, layers: [...to.layers, color] },
  };
}
