import { hiddenLayerCount, pour, applyUndo } from '../rules';
import { getHiddenDepth } from '../difficulty';
import { HIDDEN_START_LEVEL } from '../constants';
import { Tube, Move } from '../types';

describe('hiddenLayerCount', () => {
  test('hiddenCount 미지정이면 0(전부 공개)', () => {
    const t: Tube = { id: 0, capacity: 4, layers: [0, 1, 2, 3] };
    expect(hiddenLayerCount(t)).toBe(0);
  });

  test('맨 위 레이어는 항상 공개 — len-1로 클램프', () => {
    const t: Tube = { id: 0, capacity: 4, layers: [0, 1, 2], hiddenCount: 5 };
    expect(hiddenLayerCount(t)).toBe(2);
  });

  test('완성된 튜브는 전부 공개', () => {
    const t: Tube = { id: 0, capacity: 4, layers: [7, 7, 7, 7], hiddenCount: 3 };
    expect(hiddenLayerCount(t)).toBe(0);
  });
});

describe('pour 시 가려진 레이어 자동 공개', () => {
  test('맨 위를 부어내면 노출된 아래 레이어가 공개된다(단조 감소)', () => {
    // [A,B,C] 중 A,B 가려짐(hiddenCount=2), 맨 위 C 공개
    const from: Tube = { id: 0, capacity: 4, layers: [0, 1, 2], hiddenCount: 2 };
    const to: Tube = { id: 1, capacity: 4, layers: [2] };
    const result = pour(from, to);
    expect(result).not.toBeNull();
    // C가 빠지면 B가 맨 위가 되어 공개 → 가려짐 2→1
    expect(result!.from.hiddenCount).toBe(1);
    expect(hiddenLayerCount(result!.from)).toBe(1);
  });

  test('받는 튜브는 공개 색을 위에 받으므로 바닥 가려짐 유지', () => {
    const from: Tube = { id: 0, capacity: 4, layers: [5, 5] };
    const to: Tube = { id: 1, capacity: 4, layers: [9, 9, 5], hiddenCount: 2 };
    const result = pour(from, to);
    expect(result).not.toBeNull();
    expect(result!.to.hiddenCount).toBe(2);
  });
});

describe('undo는 공개 상태를 되돌리지 않는다(한 번 본 색 유지)', () => {
  test('되돌려도 hiddenCount는 다시 늘지 않는다', () => {
    // 공개됐던 상태(hiddenCount=1)에서 to가 레이어를 잃어도 단조 유지
    const tubes: Tube[] = [
      { id: 0, capacity: 4, layers: [0, 1], hiddenCount: 1 },
      { id: 1, capacity: 4, layers: [2, 2], hiddenCount: 0 },
    ];
    const move: Move = { from: 0, to: 1, count: 1, colorId: 2 };
    const restored = applyUndo(tubes, move);
    const to = restored.find((t) => t.id === 1)!;
    expect(to.hiddenCount).toBe(0);
    expect(hiddenLayerCount(to)).toBe(0);
  });
});

describe('getHiddenDepth — 고레벨부터 점진', () => {
  test('시작 레벨 미만은 0', () => {
    expect(getHiddenDepth(HIDDEN_START_LEVEL - 1)).toBe(0);
    expect(getHiddenDepth(1)).toBe(0);
  });

  test('시작 레벨부터 1칸, 레벨이 오를수록 깊어진다', () => {
    expect(getHiddenDepth(HIDDEN_START_LEVEL)).toBe(1);
    expect(getHiddenDepth(HIDDEN_START_LEVEL + 5)).toBe(2);
  });

  test('capacity-1(맨 위만 보임)에서 멈춘다', () => {
    expect(getHiddenDepth(9999)).toBe(3);
  });
});
