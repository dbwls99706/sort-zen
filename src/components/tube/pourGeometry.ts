import { TUBE_CONTAINER_TOP_GAP, TUBE_HEIGHT, TUBE_SELECTED_LIFT, TUBE_WIDTH } from './dimensions';

export type TubeLayout = { x: number; y: number; width: number; height: number };
export const POUR_TILT_DEGREES = 70;
const RIM_INSET = 4;
const RIM_TOP = 8;
const STREAM_FALL_GAP = 24;

/** Place the rotated pouring lip above the receiving rim in board coordinates. */
export function getPourGeometry(from: TubeLayout, to: TubeLayout, scale: number) {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  // At the left edge the tilted body needs to extend right, including same-column moves.
  const targetCenter = to.x + to.width / 2;
  const direction = targetCenter < TUBE_HEIGHT * safeScale ? 'left' : 'right';
  const sign = direction === 'right' ? 1 : -1;
  const angle = (sign * POUR_TILT_DEGREES * Math.PI) / 180;
  const lipX = sign * (TUBE_WIDTH / 2 - RIM_INSET);
  const lipY = TUBE_CONTAINER_TOP_GAP + RIM_TOP - (TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP) / 2;
  const rotatedX = lipX * Math.cos(angle) - lipY * Math.sin(angle);
  const rotatedY = lipX * Math.sin(angle) + lipY * Math.cos(angle);
  const toX = to.x + to.width / 2;
  const toY = to.y + (TUBE_CONTAINER_TOP_GAP + RIM_TOP) * safeScale;
  const fromX = toX;
  const fromY = toY - STREAM_FALL_GAP * safeScale;
  const translationX = (fromX - from.x - from.width / 2) / safeScale - rotatedX;
  const translationY =
    (fromY - from.y - from.height / 2) / safeScale - rotatedY + TUBE_SELECTED_LIFT;

  return { direction, fromX, fromY, toX, toY, translationX, translationY } as const;
}
