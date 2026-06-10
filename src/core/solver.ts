import { Tube, Move } from './types';
import { canPour, pour, isCleared, isTubeComplete } from './rules';

/**
 * 솔버 탐색 상한. water-sort는 NP-complete이라 비-솔버블 보드는
 * 전체 상태공간을 탐색할 수 있어 안전 상한을 둔다. 솔버블 보드는
 * DFS가 해에 빠르게 도달하므로 상한에 거의 닿지 않는다.
 */
const DEFAULT_MAX_STATES = 200000;

/** 휴리스틱 수순 정렬 가중치 (게임 규칙 아님 — 솔버 내부 탐색 튜닝값). */
const SCORE_COMPLETES_TUBE = 1000; // 이 수로 튜브가 완성됨
const SCORE_CONSOLIDATES = 100; // 같은 색 위로 합침(빈 튜브 채우기보다 유리)
const SCORE_EMPTIES_SOURCE = 50; // 소스 튜브를 비움(작업 공간 확보)

/**
 * 상태를 정규화한 문자열 키. 튜브는 서로 교환 가능하므로
 * 레이어 문자열을 정렬해 동형 상태를 하나로 묶는다 (상태공간 축소).
 */
function canonical(tubes: Tube[]): string {
  return tubes
    .map((t) => t.layers.join(','))
    .sort()
    .join('|');
}

/**
 * 탐색할 합법 수 목록 (인덱스 쌍).
 * 가지치기: 단색 튜브를 빈 튜브로 옮기는 건 진척 없는 이동이라 제외한다
 * (해를 보존하는 안전한 가지치기 — 그런 이동을 쓰는 모든 해는 쓰지 않는 등가 해가 존재).
 */
function legalMoves(tubes: Tube[]): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let i = 0; i < tubes.length; i++) {
    const from = tubes[i];
    if (from.layers.length === 0) continue;
    const monochrome = from.layers.every((c) => c === from.layers[0]);
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const to = tubes[j];
      if (!canPour(from, to)) continue;
      if (to.layers.length === 0 && monochrome) continue;
      moves.push([i, j]);
    }
  }
  return moves;
}

/**
 * 수의 유망도 점수 (높을수록 먼저 탐색). NP-complete 보드에서 plain DFS는
 * 상한에 걸리므로, 진척 있는 수(튜브 완성 > 같은색 합치기 > 소스 비우기)를
 * 우선 탐색해 솔버블 보드를 빠르게 푼다.
 */
function scoreMove(toBefore: Tube, res: { from: Tube; to: Tube; move: Move }): number {
  let s = res.move.count;
  if (isTubeComplete(res.to)) s += SCORE_COMPLETES_TUBE;
  else if (toBefore.layers.length > 0) s += SCORE_CONSOLIDATES;
  if (res.from.layers.length === 0) s += SCORE_EMPTIES_SOURCE;
  return s;
}

/**
 * 보드를 푸는 한 가지 수순을 찾는다 (최단 보장은 하지 않음 — 힌트/검증용).
 * 풀 수 없으면 null, 이미 클리어면 빈 배열.
 * 방문 정규화 집합 + 휴리스틱 우선 DFS, 탐색 상한 초과 시 null.
 */
export function findSolution(
  start: Tube[],
  maxStates: number = DEFAULT_MAX_STATES,
): Move[] | null {
  if (isCleared(start)) return [];

  const visited = new Set<string>([canonical(start)]);
  const stack: Array<{ tubes: Tube[]; path: Move[] }> = [
    { tubes: start, path: [] },
  ];
  let explored = 0;

  while (stack.length > 0) {
    if (explored++ > maxStates) return null;
    const { tubes, path } = stack.pop()!;

    const candidates: Array<{ next: Tube[]; move: Move; score: number }> = [];
    for (const [i, j] of legalMoves(tubes)) {
      const res = pour(tubes[i], tubes[j]);
      if (!res) continue;
      const next = tubes.map((t, idx) =>
        idx === i ? res.from : idx === j ? res.to : t,
      );
      if (isCleared(next)) return [...path, res.move];

      const key = canonical(next);
      if (visited.has(key)) continue;
      visited.add(key);
      candidates.push({ next, move: res.move, score: scoreMove(tubes[j], res) });
    }

    // 점수 오름차순으로 push → 가장 유망한 수가 스택 top(먼저 pop)
    candidates.sort((a, b) => a.score - b.score);
    for (const c of candidates) {
      stack.push({ tubes: c.next, path: [...path, c.move] });
    }
  }

  return null;
}

/**
 * 보드가 풀 수 있는 상태인지 여부. 생성기 검증(T141)·막힘 감지(T142)용.
 */
export function isSolvable(
  tubes: Tube[],
  maxStates: number = DEFAULT_MAX_STATES,
): boolean {
  return findSolution(tubes, maxStates) !== null;
}
