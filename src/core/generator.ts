import seedrandom from 'seedrandom';
import { Tube, ColorId } from './types';

export type GenParams = {
  colors: number;
  filledTubes: number;
  emptyTubes: number;
  capacity: number;
  shuffleSteps: number;
  seed: string;
};

export function generateLevel(params: GenParams): Tube[] {
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
    return generateLevel({ ...params, seed: seed + '_r' });
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
