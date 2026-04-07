# 01. 코어 게임 로직

> 위치: `src/core/`
> 원칙: **순수 함수만**. UI/스토어/사이드이펙트 의존 금지. 단위 테스트 필수.

---

## 1. 데이터 모델

```typescript
// src/core/types.ts
export type ColorId = number; // 0~11

export type Tube = {
  id: number;
  capacity: number;      // 보통 4
  layers: ColorId[];     // 아래(index 0) → 위
};

export type Move = {
  from: number;
  to: number;
  count: number;         // 한 번에 옮긴 레이어 수
  colorId: ColorId;
};

export type GameState = {
  tubes: Tube[];
  moves: Move[];
  level: number;
  seed: string;
  startedAt: number;
};
```

---

## 2. 상수

```typescript
// src/core/constants.ts
export const DEFAULT_CAPACITY = 4;
export const MAX_COLORS = 12;
export const MIN_COLORS = 3;
export const DEFAULT_EMPTY_TUBES = 2;
```

---

## 3. 규칙 함수 (`rules.ts`)

```typescript
import { Tube, Move, ColorId } from './types';

export function topColor(tube: Tube): ColorId | null {
  return tube.layers[tube.layers.length - 1] ?? null;
}

export function topRunLength(tube: Tube): number {
  if (tube.layers.length === 0) return 0;
  const top = topColor(tube)!;
  let n = 0;
  for (let i = tube.layers.length - 1; i >= 0; i--) {
    if (tube.layers[i] === top) n++;
    else break;
  }
  return n;
}

export function canPour(from: Tube, to: Tube): boolean {
  if (from.layers.length === 0) return false;
  if (to.layers.length >= to.capacity) return false;
  if (to.layers.length === 0) return true;
  return topColor(from) === topColor(to);
}

export function pour(
  from: Tube,
  to: Tube
): { from: Tube; to: Tube; move: Move } | null {
  if (!canPour(from, to)) return null;
  const color = topColor(from)!;
  const space = to.capacity - to.layers.length;
  const movable = Math.min(topRunLength(from), space);

  const newFrom = { ...from, layers: from.layers.slice(0, -movable) };
  const newTo = { ...to, layers: [...to.layers, ...Array(movable).fill(color)] };

  return {
    from: newFrom,
    to: newTo,
    move: { from: from.id, to: to.id, count: movable, colorId: color },
  };
}

export function isCleared(tubes: Tube[]): boolean {
  return tubes.every(
    (t) =>
      t.layers.length === 0 ||
      (t.layers.length === t.capacity && t.layers.every((c) => c === t.layers[0]))
  );
}

export function applyUndo(tubes: Tube[], lastMove: Move): Tube[] {
  // pour의 역연산: count개의 colorId 레이어를 to → from으로 되돌림
  return tubes.map((t) => {
    if (t.id === lastMove.to) {
      return { ...t, layers: t.layers.slice(0, -lastMove.count) };
    }
    if (t.id === lastMove.from) {
      return {
        ...t,
        layers: [...t.layers, ...Array(lastMove.count).fill(lastMove.colorId)],
      };
    }
    return t;
  });
}
```

---

## 4. 무한 절차적 레벨 생성기 (`generator.ts`)

> **핵심 원리**: 클리어 상태에서 시작 → 무작위 강제 pour를 N번 적용 → 항상 풀리는 보드가 보장된다 (역방향 생성).

```typescript
import seedrandom from 'seedrandom';
import { Tube } from './types';
import { DEFAULT_CAPACITY } from './constants';

export type GenParams = {
  colors: number;
  filledTubes: number;
  emptyTubes: number;
  capacity: number;
  shuffleSteps: number;
  seed: string;
};

export function generateLevel(params: GenParams): Tube[] {
  const { colors, filledTubes, emptyTubes, capacity, shuffleSteps, seed } = params;
  const rng = seedrandom(seed);

  // 1. 클리어 상태 생성
  let tubes: Tube[] = [];
  for (let c = 0; c < filledTubes; c++) {
    tubes.push({ id: c, capacity, layers: Array(capacity).fill(c) });
  }
  for (let e = 0; e < emptyTubes; e++) {
    tubes.push({ id: filledTubes + e, capacity, layers: [] });
  }

  // 2. 강제 pour로 섞기
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

  // 3. 너무 쉬운 보드 방지
  const monochromeCount = tubes.filter(
    (t) =>
      t.layers.length === capacity && t.layers.every((l) => l === t.layers[0])
  ).length;
  if (monochromeCount >= 2 && shuffleSteps > 10) {
    return generateLevel({ ...params, seed: seed + '_r' });
  }

  return tubes;
}

/**
 * 색상 매칭 무시하고 1개 레이어만 옮기는 강제 pour.
 * 생성기 내부 전용. 사용자 입력에는 절대 사용 금지.
 */
function forcedPour(from: Tube, to: Tube) {
  if (from.layers.length === 0) return null;
  if (to.layers.length >= to.capacity) return null;
  const color = from.layers[from.layers.length - 1];
  return {
    from: { ...from, layers: from.layers.slice(0, -1) },
    to: { ...to, layers: [...to.layers, color] },
  };
}
```

---

## 5. 난이도 곡선 (`difficulty.ts`)

```typescript
import { GenParams } from './generator';
import { DEFAULT_CAPACITY } from './constants';

export function getDifficulty(level: number): GenParams {
  // 1~10: 튜토리얼, 11~50: 쉬움, 51~200: 보통, 201~: 어려움
  const colors = Math.min(3 + Math.floor(level / 15), 12);
  const emptyTubes = level < 30 ? 2 : level < 100 ? 2 : 1;
  const shuffleSteps = 10 + Math.floor(level * 1.8);

  return {
    colors,
    filledTubes: colors,
    emptyTubes,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps,
    seed: `lvl-${level}-${Date.now() % 100000}`,
  };
}

/**
 * ZEN 모드: 레벨 개념 없이 매번 새로운 랜덤 보드.
 * 난이도는 중간 정도로 고정.
 */
export function getZenParams(): GenParams {
  const colors = 5 + Math.floor(Math.random() * 5);
  return {
    colors,
    filledTubes: colors,
    emptyTubes: 2,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps: 30 + Math.floor(Math.random() * 40),
    seed: `zen-${Date.now()}-${Math.random()}`,
  };
}
```

---

## 6. 단위 테스트 (필수)

```typescript
// src/core/__tests__/rules.test.ts
import { canPour, pour, isCleared, topRunLength } from '../rules';

describe('rules', () => {
  test('빈 튜브에는 부을 수 있다', () => {
    const from = { id: 0, capacity: 4, layers: [0, 0] };
    const to = { id: 1, capacity: 4, layers: [] };
    expect(canPour(from, to)).toBe(true);
  });

  test('다른 색은 못 붓는다', () => {
    const from = { id: 0, capacity: 4, layers: [0] };
    const to = { id: 1, capacity: 4, layers: [1] };
    expect(canPour(from, to)).toBe(false);
  });

  test('가득찬 튜브에는 못 붓는다', () => {
    const from = { id: 0, capacity: 4, layers: [0] };
    const to = { id: 1, capacity: 4, layers: [0, 0, 0, 0] };
    expect(canPour(from, to)).toBe(false);
  });

  test('연속된 같은 색은 한 번에 옮긴다', () => {
    const from = { id: 0, capacity: 4, layers: [1, 0, 0, 0] };
    const to = { id: 1, capacity: 4, layers: [] };
    const r = pour(from, to)!;
    expect(r.from.layers).toEqual([1]);
    expect(r.to.layers).toEqual([0, 0, 0]);
    expect(r.move.count).toBe(3);
  });

  test('공간이 부족하면 부을 수 있는 만큼만', () => {
    const from = { id: 0, capacity: 4, layers: [0, 0, 0] };
    const to = { id: 1, capacity: 4, layers: [0, 0] };
    const r = pour(from, to)!;
    expect(r.to.layers.length).toBe(4);
    expect(r.from.layers.length).toBe(1);
  });

  test('isCleared: 모두 단색 또는 빈 상태', () => {
    const tubes = [
      { id: 0, capacity: 4, layers: [0, 0, 0, 0] },
      { id: 1, capacity: 4, layers: [1, 1, 1, 1] },
      { id: 2, capacity: 4, layers: [] },
    ];
    expect(isCleared(tubes)).toBe(true);
  });
});
```

```typescript
// src/core/__tests__/generator.test.ts
import { generateLevel } from '../generator';
import { getDifficulty } from '../difficulty';

describe('generator', () => {
  test('생성된 보드의 총 레이어 수가 colors × capacity와 같다', () => {
    const params = getDifficulty(20);
    const tubes = generateLevel(params);
    const total = tubes.reduce((s, t) => s + t.layers.length, 0);
    expect(total).toBe(params.colors * params.capacity);
  });

  test('각 색상은 정확히 capacity개만큼 존재한다', () => {
    const params = getDifficulty(50);
    const tubes = generateLevel(params);
    const counts: Record<number, number> = {};
    tubes.forEach((t) => t.layers.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
    Object.values(counts).forEach((n) => expect(n).toBe(params.capacity));
  });

  test('동일 시드는 동일 보드를 생성한다', () => {
    const params = { ...getDifficulty(10), seed: 'fixed-seed' };
    const a = generateLevel(params);
    const b = generateLevel(params);
    expect(a).toEqual(b);
  });
});
```

---

## 7. 구현 순서

1. `types.ts`, `constants.ts`
2. `rules.ts` + 테스트 → 모두 통과 후 다음 단계
3. `generator.ts` + 테스트 → 모두 통과 후 다음 단계
4. `difficulty.ts`
5. gameStore와 연결