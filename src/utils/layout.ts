import {
  TUBE_WIDTH,
  TUBE_HEIGHT,
  TUBE_CONTAINER_TOP_GAP,
} from '../components/tube/dimensions';

export const TUBE_GRID_GAP = 12;
const FOOTPRINT_W = TUBE_WIDTH + TUBE_GRID_GAP;
const FOOTPRINT_H = TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP + TUBE_GRID_GAP;

const MIN_SCALE = 0.5;
const STEP = 0.02;

/**
 * 튜브 개수와 가용 영역에 맞춰 모든 튜브가 들어가는 최대 스케일(0.5~1)을 구한다.
 * flexWrap 그리드가 세로로 넘치지 않도록 가장 큰 스케일을 선형 탐색한다. (순수 함수)
 */
export function computeTubeScale(
  count: number,
  availWidth: number,
  availHeight: number,
): number {
  if (count <= 0 || availWidth <= 0 || availHeight <= 0) return 1;
  for (let s = 1; s > MIN_SCALE; s -= STEP) {
    const perRow = Math.max(1, Math.floor(availWidth / (FOOTPRINT_W * s)));
    const rows = Math.ceil(count / perRow);
    if (rows * FOOTPRINT_H * s <= availHeight) {
      return Math.round(s * 100) / 100;
    }
  }
  return MIN_SCALE;
}
