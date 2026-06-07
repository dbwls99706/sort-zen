import { Skia, SkPath } from '@shopify/react-native-skia';

/** 소스→대상 입구를 잇는 호(arc) 패스. lift만큼 위로 솟구친다. */
export function makeArcPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  lift: number,
): SkPath {
  const peakY = Math.min(fromY, toY) - lift;
  const path = Skia.Path.Make();
  path.moveTo(fromX, fromY);
  path.cubicTo(fromX, peakY, toX, peakY, toX, toY);
  return path;
}

/**
 * 진행도 t(0~1)에 따라 스트림을 잘라 "머리가 차오르고 꼬리가 빠지는" 모양을 만든다.
 * 전반부(fillPhase)에 머리가 대상에 닿고, 후반부에 꼬리가 따라가며 비워진다.
 * reanimated 워클릿에서 호출 가능.
 */
export function trimmedStream(
  base: SkPath,
  t: number,
  fillPhase: number,
): SkPath {
  'worklet';
  const head = t < fillPhase ? t / fillPhase : 1;
  const tail = t < fillPhase ? 0 : (t - fillPhase) / (1 - fillPhase);
  const copy = base.copy();
  copy.trim(tail, head, false);
  return copy;
}
