import { TUBE_WIDTH, TUBE_HEIGHT, TUBE_CONTAINER_TOP_GAP } from '../components/tube/dimensions';

export const TUBE_GRID_GAP = 12;
export const MIN_TUBE_TARGET = 48;
const MIN_SCALE = 0.94;
const SCALE_STEP = 0.02;

/** Uses the actual unscaled gap; every target stays at least 48 logical pixels. */
export function computeBoardLayout(count: number, availWidth: number, availHeight: number) {
  const width = Math.max(
    MIN_TUBE_TARGET,
    Number.isFinite(availWidth) ? availWidth : MIN_TUBE_TARGET,
  );
  const height = Math.max(0, Number.isFinite(availHeight) ? availHeight : 0);
  const tubeCount = Math.max(1, Number.isFinite(count) ? Math.ceil(count) : 1);
  const atScale = (scale: number) => {
    const cellWidth = Math.max(MIN_TUBE_TARGET, TUBE_WIDTH * scale);
    const columns = Math.min(
      tubeCount,
      Math.max(1, Math.floor((width + TUBE_GRID_GAP) / (cellWidth + TUBE_GRID_GAP))),
    );
    const rows = Math.ceil(tubeCount / columns);
    const contentHeight =
      rows * (TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP) * scale + (rows - 1) * TUBE_GRID_GAP;
    return {
      scale,
      cellWidth,
      columns,
      rows,
      width: columns * cellWidth + (columns - 1) * TUBE_GRID_GAP,
      contentHeight,
      scrolls: contentHeight > height,
    };
  };
  for (let step = 0; step <= Math.round((1 - MIN_SCALE) / SCALE_STEP); step++) {
    const candidate = atScale(Number((1 - step * SCALE_STEP).toFixed(2)));
    if (!candidate.scrolls) return candidate;
  }
  return atScale(MIN_SCALE);
}

export function computeTubeScale(count: number, availWidth: number, availHeight: number): number {
  if (count <= 0 || availWidth <= 0 || availHeight <= 0) return 1;
  return computeBoardLayout(count, availWidth, availHeight).scale;
}
