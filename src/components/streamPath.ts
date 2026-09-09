import { Skia, SkPath } from '@shopify/react-native-skia';

/** Gravity bends the stream down from the lip; it never climbs above it. */
export function makeGravityPath(fromX: number, fromY: number, toX: number, toY: number): SkPath {
  const path = Skia.Path.Make();
  const drop = Math.max(0, toY - fromY);
  path.moveTo(fromX, fromY);
  path.cubicTo(
    fromX + (toX - fromX) * 0.55,
    fromY + drop * 0.18,
    toX,
    fromY + drop * 0.65,
    toX,
    toY,
  );
  return path;
}

/** The onboarding illustration retains its stylized teaching arc. */
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

export function trimmedStream(base: SkPath, t: number, fillPhase: number): SkPath {
  'worklet';
  const head = t < fillPhase ? t / fillPhase : 1;
  const tail = t < fillPhase ? 0 : (t - fillPhase) / (1 - fillPhase);
  const copy = base.copy();
  copy.trim(tail, head, false);
  return copy;
}
