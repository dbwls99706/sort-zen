import { Tube, Move } from './types';
import { canPour, pour, isCleared, isTubeComplete } from './rules';

const DEFAULT_MAX_STATES = 200000;
const DEFAULT_ASYNC_MAX_STATES = 20000;
const DEFAULT_BATCH_SIZE = 64;
const MAX_SLICE_MS = 6;
const SCORE_COMPLETES_TUBE = 1000;
const SCORE_CONSOLIDATES = 100;
const SCORE_EMPTIES_SOURCE = 50;

function canonical(tubes: Tube[]): string {
  return tubes
    .map((tube) => `${tube.capacity}:${tube.layers.join(',')}`)
    .sort()
    .join('|');
}

function legalMoves(tubes: Tube[]): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let i = 0; i < tubes.length; i++) {
    const from = tubes[i];
    if (from.layers.length === 0) continue;
    const monochrome = from.layers.every((color) => color === from.layers[0]);
    const emptyCapacities = new Set<number>();
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const to = tubes[j];
      if (!canPour(from, to)) continue;
      if (to.layers.length === 0) {
        // Equivalent empty destinations need only one search branch.
        if (emptyCapacities.has(to.capacity)) continue;
        emptyCapacities.add(to.capacity);
        if (monochrome && to.capacity === from.capacity) continue;
      }
      moves.push([i, j]);
    }
  }
  return moves;
}

function scoreMove(toBefore: Tube, res: { from: Tube; to: Tube; move: Move }): number {
  let score = res.move.count;
  if (isTubeComplete(res.to)) score += SCORE_COMPLETES_TUBE;
  else if (toBefore.layers.length > 0) score += SCORE_CONSOLIDATES;
  if (res.from.layers.length === 0) score += SCORE_EMPTIES_SOURCE;
  return score;
}

type SearchNode = { tubes: Tube[]; parent: SearchNode | null; move: Move | null };

function pathTo(node: SearchNode, lastMove: Move): Move[] {
  const path = [lastMove];
  for (let cursor: SearchNode | null = node; cursor?.move; cursor = cursor.parent) {
    path.push(cursor.move);
  }
  return path.reverse();
}

/** Parent links avoid copying a growing solution array for every explored branch. */
function* searchSolution(start: Tube[], maxStates: number): Generator<void, Move[] | null> {
  if (isCleared(start)) return [];
  const visited = new Set<string>([canonical(start)]);
  const stack: SearchNode[] = [{ tubes: start, parent: null, move: null }];
  let explored = 0;
  while (stack.length > 0 && explored < maxStates) {
    explored += 1;
    const node = stack.pop()!;
    const candidates: Array<{ node: SearchNode; score: number }> = [];
    for (const [i, j] of legalMoves(node.tubes)) {
      const res = pour(node.tubes[i], node.tubes[j]);
      if (!res) continue;
      const next = node.tubes.map((tube, index) =>
        index === i ? res.from : index === j ? res.to : tube,
      );
      if (isCleared(next)) return pathTo(node, res.move);
      const key = canonical(next);
      if (visited.has(key)) continue;
      visited.add(key);
      candidates.push({
        node: { tubes: next, parent: node, move: res.move },
        score: scoreMove(node.tubes[j], res),
      });
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const candidate of candidates) stack.push(candidate.node);
    yield;
  }
  return null;
}

/** A valid solution, not necessarily the shortest. Null also means the budget expired. */
export function findSolution(start: Tube[], maxStates = DEFAULT_MAX_STATES): Move[] | null {
  const search = searchSolution(start, maxStates);
  let result = search.next();
  while (!result.done) result = search.next();
  return result.value;
}

export type SolutionOptions = { signal?: AbortSignal; maxStates?: number; batchSize?: number };

/** Yields to input/render tasks before and during hints; cancelled searches return null. */
export async function findSolutionAsync(
  start: Tube[],
  options: SolutionOptions = {},
): Promise<Move[] | null> {
  const { signal, maxStates = DEFAULT_ASYNC_MAX_STATES } = options;
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE));
  const search = searchSolution(start, maxStates);
  while (!signal?.aborted) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (signal?.aborted) return null;
    const sliceStart = Date.now();
    for (let count = 0; count < batchSize; count++) {
      const result = search.next();
      if (result.done) return result.value;
      if (Date.now() - sliceStart >= MAX_SLICE_MS) break;
    }
  }
  return null;
}

export function hasLegalMove(tubes: Tube[]): boolean {
  return legalMoves(tubes).length > 0;
}

export function isSolvable(tubes: Tube[], maxStates = DEFAULT_MAX_STATES): boolean {
  return findSolution(tubes, maxStates) !== null;
}
