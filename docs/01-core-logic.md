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

클리어 상태에서 시작하여 **실제 게임의 최대 연속 레이어 붓기로 정확히 되돌릴 수 있는 이동**만 셔플에 사용한다. 셔플의 역순을 해로 함께 보관하므로 생성 중 DFS 탐색이나 재귀 재시도가 필요 없다.

### 반환값과 입력 의미

```typescript
export type GenParams = {
  colors: number;
  filledTubes: number;
  emptyTubes: number;
  capacity: number;
  shuffleSteps: number;
  seed: string;
};

export type GeneratedLevel = { tubes: Tube[]; solution: Move[] };

export function generateLevelWithSolution(params: GenParams): GeneratedLevel;
export function generateLevel(params: GenParams): Tube[];
```

- `filledTubes`개의 색상을 각각 `capacity`칸씩 만든다. 현재 난이도 설정은 `colors === filledTubes`를 사용한다.
- 전체 튜브 수는 항상 `filledTubes + emptyTubes`이다. 생성 실패를 이유로 튜브를 추가하지 않는다.
- `emptyTubes`는 셔플 전 빈 튜브 수이며, **셔플 후에도 동일한 수의 튜브가 완전히 빈다는 의미는 아니다.** 전체 여유 공간 `emptyTubes × capacity`가 여러 튜브에 나뉠 수 있다. 이 의미는 기존 생성기와 같다.
- 같은 파라미터와 시드는 같은 보드와 해를 반환한다. 실제 새 게임은 난이도 함수가 새 시드를 제공하고, 다시하기는 스토어의 시작 스냅샷을 복원한다.
- `solution`은 일반 `pour()`를 순서대로 실행하면 클리어되는 해이다. 최단 해라는 보장은 없다. 스토어는 이 길이를 별점 기준으로 사용하며 같은 보드를 다시 동기 탐색하지 않는다.

### 역방향 셔플의 허용 조건

소스 `A` 맨 위의 색 `c`를 `k`칸 떼어 대상 `B` 위에 올리는 셔플을 생각한다. 아래 조건을 모두 만족해야 한다.

1. `A`와 `B`가 다르고, `k`는 `A`의 맨 위 연속 색 길이와 `B`의 남은 용량 이하이다.
2. 이동 후 `A`는 비어 있거나 맨 위 색이 계속 `c`여야 한다. 혼합 튜브의 맨 위 연속 구간 전체를 떼어 다른 색을 노출하는 셔플은 제외한다.
3. 이동 전 `B`의 맨 위도 `c`라면 이동 전 `A`가 가득 차 있어야 한다.

이 조건은 게임이 같은 색 여러 칸을 한꺼번에 붓는 경우까지 포함한다.

| 이동 전 B의 맨 위 | 셔플 후 B에서 A로 붓는 실제 칸 수 |
|---|---|
| 비어 있거나 `c`와 다른 색 | B의 맨 위 연속 `c`가 정확히 `k`칸이므로 `k`칸을 붓는다. |
| `c`와 같은 색 | A가 원래 가득 차 있어 남은 공간이 정확히 `k`칸이므로 `k`칸만 붓는다. |

어느 경우든 A가 비어 있거나 같은 색으로 끝나므로 역방향 이동은 합법이며, `pour(B, A)`의 `move.count`가 정확히 `k`가 된다. 따라서 각 셔플 직전 상태를 정확히 복원할 수 있고, 기록한 이동을 역순으로 재생하면 최초 클리어 상태에 도달한다. 색상 일치 조건을 무시한 임의의 한 칸 이동만으로는 이 보장을 할 수 없다.

### 종료 한계와 보드 선택

- 셔플 수를 `0..MAX_SHUFFLE_STEPS`로 제한한다. 현재 상한은 300이다.
- 한 단계의 후보 수는 튜브 수를 `T`, 용량을 `C`라고 할 때 최대 `T × (T − 1) × C`이다. 후보를 중복 없이 검사하고, 이미 방문한 상태는 제외한다.
- 더 진행할 후보가 없으면 즉시 종료한다. 생성 중 솔버 호출, 재귀, 무제한 재시도는 없다.
- 후보 전체의 보드를 미리 복사하지 않고 선택한 후보만 구체화해 할당량을 줄인다.
- 방문한 상태 중 가득 찬 단색 튜브가 적고 색 경계가 많은 보드를 선택한다. 점수가 같으면 먼저 찾은 보드와 더 짧은 셔플 경로를 유지한다.
- 선택한 보드에 해당하는 셔플 접두 구간의 역순만 반환한다. 이후 셔플은 반환하는 해에 섞이지 않는다.
- 셔플 0회 등 혼합이 불가능한 입력은 클리어 보드와 빈 해를 반환할 수 있다. 혼합 선호 점수 자체를 모든 입력에서의 난이도 보장으로 해석하지 않는다.

### 검증

`generator.test.ts`는 시드 재현성, 총 튜브 수, 색상 보존, 용량, 시작 완성 튜브 회귀를 확인한다. 또한 용량 2~5, 색상 3·6·9·12, 여유 튜브 1~3의 조합에서 반환된 해를 실제 `pour()`로 재생하여 **매 이동의 색·출발·도착·최대 이동 칸 수가 기록과 정확히 같고 최종 보드가 클리어됨**을 검사한다. 과도한 셔플 요청이 설정 상한과 같은 결과를 내는지도 확인한다.

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