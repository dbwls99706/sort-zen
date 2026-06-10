import { Tube } from '../types';
import { pour, isCleared } from '../rules';
import { findSolution, isSolvable, hasLegalMove } from '../solver';
import { generateLevel } from '../generator';
import { getDifficulty } from '../difficulty';

/** 수순을 보드에 차례로 적용해 최종 보드를 반환 (id 기반 재생). */
function replay(tubes: Tube[], moves: ReturnType<typeof findSolution>): Tube[] {
  let cur = tubes.map((t) => ({ ...t, layers: [...t.layers] }));
  for (const m of moves ?? []) {
    const from = cur.find((t) => t.id === m.from)!;
    const to = cur.find((t) => t.id === m.to)!;
    const res = pour(from, to)!;
    cur = cur.map((t) =>
      t.id === res.from.id ? res.from : t.id === res.to.id ? res.to : t,
    );
  }
  return cur;
}

describe('solver', () => {
  test('이미 클리어된 보드는 빈 수순을 반환한다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 0, 0, 0] },
      { id: 1, capacity: 4, layers: [] },
    ];
    expect(findSolution(tubes)).toEqual([]);
    expect(isSolvable(tubes)).toBe(true);
  });

  test('간단한 보드의 수순을 재생하면 클리어된다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1, 0, 1] },
      { id: 1, capacity: 4, layers: [1, 0, 1, 0] },
      { id: 2, capacity: 4, layers: [] },
      { id: 3, capacity: 4, layers: [] },
    ];
    const sol = findSolution(tubes);
    expect(sol).not.toBeNull();
    expect(isCleared(replay(tubes, sol))).toBe(true);
  });

  test('각 수는 유효한 pour다 (null pour 없음)', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1, 2, 0] },
      { id: 1, capacity: 4, layers: [1, 2, 0, 1] },
      { id: 2, capacity: 4, layers: [2, 0, 1, 2] },
      { id: 3, capacity: 4, layers: [] },
      { id: 4, capacity: 4, layers: [] },
    ];
    const sol = findSolution(tubes)!;
    let cur = tubes.map((t) => ({ ...t, layers: [...t.layers] }));
    for (const m of sol) {
      const from = cur.find((t) => t.id === m.from)!;
      const to = cur.find((t) => t.id === m.to)!;
      const res = pour(from, to);
      expect(res).not.toBeNull();
      cur = cur.map((t) =>
        t.id === res!.from.id ? res!.from : t.id === res!.to.id ? res!.to : t,
      );
    }
    expect(isCleared(cur)).toBe(true);
  });

  test('풀 수 없는 보드는 null을 반환한다', () => {
    // 빈 튜브 없음 + 서로 막힌 배치 → 합법 수 0, 미완성
    const tubes: Tube[] = [
      { id: 0, capacity: 2, layers: [0, 1] },
      { id: 1, capacity: 2, layers: [1, 0] },
    ];
    expect(findSolution(tubes)).toBeNull();
    expect(isSolvable(tubes)).toBe(false);
  });

  test('탐색 상한을 넘으면 null을 반환한다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1, 2, 0] },
      { id: 1, capacity: 4, layers: [1, 2, 0, 1] },
      { id: 2, capacity: 4, layers: [2, 0, 1, 2] },
      { id: 3, capacity: 4, layers: [] },
    ];
    expect(findSolution(tubes, 0)).toBeNull();
  });

  test('솔버블한 생성 보드(빈튜브 2개)를 풀어낸다', () => {
    // 빈튜브 2개 난이도(레벨 <100)는 솔버블하다. 빈튜브 1개(레벨 100+)는
    // 현재 생성기가 비-솔버블 보드를 만들 수 있어 T141 검증 게이트에서 다룬다.
    for (const level of [5, 20, 60, 99]) {
      const params = { ...getDifficulty(level), seed: `solver-test-${level}` };
      const tubes = generateLevel(params);
      const sol = findSolution(tubes);
      expect(sol).not.toBeNull();
      expect(isCleared(replay(tubes, sol))).toBe(true);
    }
  });

  test('단색→빈 튜브 재배치 가지치기로도 해를 놓치지 않는다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 0, 1, 1] },
      { id: 1, capacity: 4, layers: [1, 1, 0, 0] },
      { id: 2, capacity: 4, layers: [] },
    ];
    const sol = findSolution(tubes);
    expect(sol).not.toBeNull();
    expect(isCleared(replay(tubes, sol))).toBe(true);
  });
});

describe('hasLegalMove (막힘 감지 T142)', () => {
  test('부을 수 있는 곳이 있으면 true', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1] },
      { id: 1, capacity: 4, layers: [] },
    ];
    expect(hasLegalMove(tubes)).toBe(true);
  });

  test('서로 막힌 보드는 false', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 2, layers: [0, 1] },
      { id: 1, capacity: 2, layers: [1, 0] },
    ];
    expect(hasLegalMove(tubes)).toBe(false);
  });

  test('남은 수가 단색→빈 튜브 재배치뿐이면 막힘으로 본다', () => {
    // 색 0이 2칸뿐이라 어떤 이동으로도 완성 불가 → 진척 없는 이동만 남음
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 0] },
      { id: 1, capacity: 4, layers: [] },
    ];
    expect(hasLegalMove(tubes)).toBe(false);
  });

  test('클리어된 보드는 false (이동 불필요)', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 2, layers: [0, 0] },
      { id: 1, capacity: 2, layers: [] },
    ];
    expect(hasLegalMove(tubes)).toBe(false);
  });
});
