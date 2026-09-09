import seedrandom from 'seedrandom';
import { Tube, Move } from './types';
import { isTubeComplete, topColor, topRunLength } from './rules';
import { MAX_SHUFFLE_STEPS } from './constants';

export type GenParams = {
  colors: number;
  filledTubes: number;
  emptyTubes: number;
  capacity: number;
  shuffleSteps: number;
  seed: string;
};

export type GeneratedLevel = { tubes: Tube[]; solution: Move[] };

/** A visible color boundary is useful mixing; pre-completed tubes are avoided first. */
const MIXED_BOUNDARY_WEIGHT = 10;
const COMPLETE_TUBE_PENALTY = 1000;

function boardKey(tubes: Tube[]): string {
  return tubes.map((tube) => tube.layers.join(',')).join('|');
}

function mixingScore(tubes: Tube[]): number {
  return tubes.reduce((score, tube) => {
    let boundaries = 0;
    for (let index = 1; index < tube.layers.length; index++) {
      if (tube.layers[index] !== tube.layers[index - 1]) boundaries += 1;
    }
    return (
      score +
      boundaries * MIXED_BOUNDARY_WEIGHT -
      (isTubeComplete(tube) ? COMPLETE_TUBE_PENALTY : 0)
    );
  }, 0);
}

/**
 * Every shuffle must have an exact legal, maximal forward pour as its inverse.
 * The source must keep the same top color (or become empty). If the destination
 * already has that color, only a full source can limit the inverse to this count.
 */
function reverseMoves(tubes: Tube[]): Move[] {
  const moves: Move[] = [];
  for (const from of tubes) {
    const color = topColor(from);
    if (color === null) continue;
    const run = topRunLength(from);
    for (const to of tubes) {
      if (from.id === to.id) continue;
      if (topColor(to) === color && from.layers.length !== from.capacity) continue;
      const maxCount = Math.min(run, to.capacity - to.layers.length);
      for (let count = 1; count <= maxCount; count++) {
        if (count === run && run < from.layers.length) continue;
        moves.push({ from: from.id, to: to.id, colorId: color, count });
      }
    }
  }
  return moves;
}

/** Build only the chosen candidate board, rather than cloning every possible move. */
function pickReverseStep(tubes: Tube[], visited: Set<string>, rng: () => number) {
  const candidates = reverseMoves(tubes);
  while (candidates.length > 0) {
    const index = Math.floor(rng() * candidates.length);
    const move = candidates[index];
    candidates[index] = candidates[candidates.length - 1];
    candidates.pop();
    const next = tubes.map((tube) => {
      if (tube.id === move.from) return { ...tube, layers: tube.layers.slice(0, -move.count) };
      if (tube.id === move.to)
        return {
          ...tube,
          layers: [...tube.layers, ...Array<number>(move.count).fill(move.colorId)],
        };
      return tube;
    });
    const key = boardKey(next);
    if (visited.has(key)) continue;
    return { tubes: next, key, inverse: { ...move, from: move.to, to: move.from } };
  }
  return null;
}

/** Bounded constructive generation: the shuffle itself is the solvability proof. */
export function generateLevelWithSolution(params: GenParams): GeneratedLevel {
  const { filledTubes, emptyTubes, capacity, seed } = params;
  const rng = seedrandom(seed);
  let tubes: Tube[] = Array.from({ length: filledTubes + emptyTubes }, (_, id) => ({
    id,
    capacity,
    layers: id < filledTubes ? Array<number>(capacity).fill(id) : [],
  }));
  let best: GeneratedLevel = { tubes, solution: [] };
  let bestScore = mixingScore(tubes);
  const inverseMoves: Move[] = [];
  const visited = new Set<string>([boardKey(tubes)]);
  const steps = Math.min(Math.max(0, params.shuffleSteps), MAX_SHUFFLE_STEPS);

  for (let step = 0; step < steps; step++) {
    const candidate = pickReverseStep(tubes, visited, rng);
    if (!candidate) break;
    tubes = candidate.tubes;
    visited.add(candidate.key);
    inverseMoves.push(candidate.inverse);
    const score = mixingScore(tubes);
    if (score > bestScore) {
      bestScore = score;
      best = { tubes, solution: [...inverseMoves].reverse() };
    }
  }
  return best;
}

export function generateLevel(params: GenParams): Tube[] {
  return generateLevelWithSolution(params).tubes;
}
