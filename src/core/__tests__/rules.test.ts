import {
  canPour,
  pour,
  isCleared,
  topColor,
  topRunLength,
  applyUndo,
} from '../rules';
import { Tube, Move } from '../types';

describe('topColor', () => {
  test('빈 튜브는 null을 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [] };
    expect(topColor(tube)).toBeNull();
  });

  test('최상단 색상을 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [0, 1, 2] };
    expect(topColor(tube)).toBe(2);
  });
});

describe('topRunLength', () => {
  test('빈 튜브는 0을 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [] };
    expect(topRunLength(tube)).toBe(0);
  });

  test('연속된 같은 색의 개수를 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [1, 0, 0, 0] };
    expect(topRunLength(tube)).toBe(3);
  });

  test('전부 같은 색이면 전체 길이를 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [2, 2, 2, 2] };
    expect(topRunLength(tube)).toBe(4);
  });

  test('하나만 있으면 1을 반환한다', () => {
    const tube: Tube = { id: 0, capacity: 4, layers: [5] };
    expect(topRunLength(tube)).toBe(1);
  });
});

describe('canPour', () => {
  test('빈 튜브에는 부을 수 있다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0, 0] };
    const to: Tube = { id: 1, capacity: 4, layers: [] };
    expect(canPour(from, to)).toBe(true);
  });

  test('다른 색은 못 붓는다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0] };
    const to: Tube = { id: 1, capacity: 4, layers: [1] };
    expect(canPour(from, to)).toBe(false);
  });

  test('가득찬 튜브에는 못 붓는다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0] };
    const to: Tube = { id: 1, capacity: 4, layers: [0, 0, 0, 0] };
    expect(canPour(from, to)).toBe(false);
  });

  test('빈 튜브에서는 못 붓는다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [] };
    const to: Tube = { id: 1, capacity: 4, layers: [0] };
    expect(canPour(from, to)).toBe(false);
  });

  test('같은 색이면 부을 수 있다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0, 0] };
    const to: Tube = { id: 1, capacity: 4, layers: [0] };
    expect(canPour(from, to)).toBe(true);
  });
});

describe('pour', () => {
  test('연속된 같은 색은 한 번에 옮긴다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [1, 0, 0, 0] };
    const to: Tube = { id: 1, capacity: 4, layers: [] };
    const r = pour(from, to)!;
    expect(r.from.layers).toEqual([1]);
    expect(r.to.layers).toEqual([0, 0, 0]);
    expect(r.move.count).toBe(3);
    expect(r.move.colorId).toBe(0);
  });

  test('공간이 부족하면 부을 수 있는 만큼만', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0, 0, 0] };
    const to: Tube = { id: 1, capacity: 4, layers: [0, 0] };
    const r = pour(from, to)!;
    expect(r.to.layers.length).toBe(4);
    expect(r.from.layers.length).toBe(1);
    expect(r.move.count).toBe(2);
  });

  test('부을 수 없으면 null을 반환한다', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0] };
    const to: Tube = { id: 1, capacity: 4, layers: [1] };
    expect(pour(from, to)).toBeNull();
  });

  test('원본 튜브를 변경하지 않는다 (불변성)', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [0, 1, 1] };
    const to: Tube = { id: 1, capacity: 4, layers: [1] };
    const originalFromLayers = [...from.layers];
    const originalToLayers = [...to.layers];
    pour(from, to);
    expect(from.layers).toEqual(originalFromLayers);
    expect(to.layers).toEqual(originalToLayers);
  });
});

describe('isCleared', () => {
  test('모두 단색 또는 빈 상태이면 클리어', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 0, 0, 0] },
      { id: 1, capacity: 4, layers: [1, 1, 1, 1] },
      { id: 2, capacity: 4, layers: [] },
    ];
    expect(isCleared(tubes)).toBe(true);
  });

  test('섞여있으면 클리어 아님', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1, 0, 0] },
      { id: 1, capacity: 4, layers: [1, 0, 1, 1] },
      { id: 2, capacity: 4, layers: [] },
    ];
    expect(isCleared(tubes)).toBe(false);
  });

  test('단색이지만 덜 찬 튜브가 있으면 클리어 아님', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 0, 0] },
      { id: 1, capacity: 4, layers: [1, 1, 1, 1] },
    ];
    expect(isCleared(tubes)).toBe(false);
  });

  test('빈 튜브만 있어도 클리어', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [] },
      { id: 1, capacity: 4, layers: [] },
    ];
    expect(isCleared(tubes)).toBe(true);
  });
});

describe('applyUndo', () => {
  test('pour의 역연산이 정확하다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [1] },
      { id: 1, capacity: 4, layers: [0, 0, 0] },
    ];
    const move: Move = { from: 0, to: 1, count: 3, colorId: 0 };
    const restored = applyUndo(tubes, move);
    expect(restored[0].layers).toEqual([1, 0, 0, 0]);
    expect(restored[1].layers).toEqual([]);
  });

  test('관련 없는 튜브는 변경하지 않는다', () => {
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [1] },
      { id: 1, capacity: 4, layers: [0, 0] },
      { id: 2, capacity: 4, layers: [2, 2] },
    ];
    const move: Move = { from: 0, to: 1, count: 2, colorId: 0 };
    const restored = applyUndo(tubes, move);
    expect(restored[2].layers).toEqual([2, 2]);
  });
});
