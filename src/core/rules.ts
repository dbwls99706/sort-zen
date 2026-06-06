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
  to: Tube,
): { from: Tube; to: Tube; move: Move } | null {
  if (!canPour(from, to)) return null;
  const color = topColor(from)!;
  const space = to.capacity - to.layers.length;
  const movable = Math.min(topRunLength(from), space);

  const newFrom: Tube = { ...from, layers: from.layers.slice(0, -movable) };
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
      return { ...t, layers: t.layers.slice(0, -lastMove.count) };
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
