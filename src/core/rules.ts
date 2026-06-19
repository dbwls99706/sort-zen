import { Tube, Move, ColorId } from './types';

export function topColor(tube: Tube): ColorId | null {
  return tube.layers[tube.layers.length - 1] ?? null;
}

/** 가려짐 수를 유효 범위로 클램프(맨 위는 항상 공개) — 노출 시 자동 공개를 만든다. */
function clampHidden(hidden: number | undefined, len: number): number {
  return Math.min(hidden ?? 0, Math.max(0, len - 1));
}

/**
 * 현재 색이 가려진(미공개) 레이어 수. 바닥부터 연속이며 맨 위는 항상 보인다.
 * 완성된 튜브는 전부 공개한다(이미 푼 것이므로 회색으로 둘 이유가 없다). 렌더링용.
 */
export function hiddenLayerCount(tube: Tube): number {
  const h = tube.hiddenCount ?? 0;
  if (h <= 0 || isTubeComplete(tube)) return 0;
  return clampHidden(h, tube.layers.length);
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
  to: Tube,
): { from: Tube; to: Tube; move: Move } | null {
  if (!canPour(from, to)) return null;
  const color = topColor(from)!;
  const space = to.capacity - to.layers.length;
  const movable = Math.min(topRunLength(from), space);

  const newFromLayers = from.layers.slice(0, -movable);
  // 소스는 맨 위를 잃어 아래 가려진 레이어가 노출될 수 있다 → 자동 공개(클램프).
  const newFrom: Tube = {
    ...from,
    layers: newFromLayers,
    hiddenCount: clampHidden(from.hiddenCount, newFromLayers.length),
  };
  // 대상은 공개된 색을 위에 받으므로 바닥의 가려짐은 그대로 유지된다.
  const newTo: Tube = {
    ...to,
    layers: [...to.layers, ...Array<ColorId>(movable).fill(color)],
  };

  return {
    from: newFrom,
    to: newTo,
    move: { from: from.id, to: to.id, count: movable, colorId: color },
  };
}

export function isTubeComplete(tube: Tube): boolean {
  return (
    tube.layers.length === tube.capacity &&
    tube.layers.every((c) => c === tube.layers[0])
  );
}

export function isCleared(tubes: Tube[]): boolean {
  return tubes.every((t) => t.layers.length === 0 || isTubeComplete(t));
}

export function applyUndo(tubes: Tube[], lastMove: Move): Tube[] {
  return tubes.map((t) => {
    if (t.id === lastMove.to) {
      const layers = t.layers.slice(0, -lastMove.count);
      // 되돌려도 한 번 본 색은 다시 가려지지 않는다(단조). 노출 상태 유지.
      return { ...t, layers, hiddenCount: clampHidden(t.hiddenCount, layers.length) };
    }
    if (t.id === lastMove.from) {
      return {
        ...t,
        layers: [
          ...t.layers,
          ...Array<ColorId>(lastMove.count).fill(lastMove.colorId),
        ],
      };
    }
    return t;
  });
}
