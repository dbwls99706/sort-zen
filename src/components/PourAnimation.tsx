import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const POUR_DURATION_MS = 520;
const FILL_PHASE = 0.55; // 스트림 머리가 대상 입구에 닿는 진행도
const ARC_LIFT = 46; // 스트림이 솟구치는 높이
const STREAM_WIDTH = 9;
const SPLASH_RADIUS = 14;
const SPLASH_OPACITY = 0.6;

type PourStreamProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  scale?: number;
  onComplete: () => void;
};

/**
 * 소스 튜브 입구에서 대상 튜브 입구로 호를 그리며 흐르는 액체 스트림.
 * 전반부(FILL_PHASE)에 머리가 차오르고, 후반부에 꼬리가 따라가며 빠진다(붓고 끊기는 느낌).
 * 착지 지점에는 스플래시 원이 잠깐 퍼진다.
 */
export function PourStream({
  fromX,
  fromY,
  toX,
  toY,
  color,
  scale = 1,
  onComplete,
}: PourStreamProps) {
  const progress = useSharedValue(0);
  const arcLift = ARC_LIFT * scale;
  const streamWidth = STREAM_WIDTH * scale;
  const splashMax = SPLASH_RADIUS * scale;

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: POUR_DURATION_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, [progress, onComplete]);

  const basePath = useMemo(() => {
    const peakY = Math.min(fromY, toY) - arcLift;
    const path = Skia.Path.Make();
    path.moveTo(fromX, fromY);
    path.cubicTo(fromX, peakY, toX, peakY, toX, toY);
    return path;
  }, [fromX, fromY, toX, toY, arcLift]);

  const streamPath = useDerivedValue(() => {
    const t = progress.value;
    const head = t < FILL_PHASE ? t / FILL_PHASE : 1;
    const tail = t < FILL_PHASE ? 0 : (t - FILL_PHASE) / (1 - FILL_PHASE);
    const copy = basePath.copy();
    copy.trim(tail, head, false);
    return copy;
  });

  const splashRadius = useDerivedValue(() => {
    const t = progress.value;
    if (t < FILL_PHASE) return 0;
    const k = (t - FILL_PHASE) / (1 - FILL_PHASE);
    return Math.sin(k * Math.PI) * splashMax;
  });

  const splashOpacity = useDerivedValue(() => {
    const t = progress.value;
    if (t < FILL_PHASE) return 0;
    const k = (t - FILL_PHASE) / (1 - FILL_PHASE);
    return (1 - k) * SPLASH_OPACITY;
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={streamPath}
        style="stroke"
        strokeWidth={streamWidth}
        strokeCap="round"
        strokeJoin="round"
        color={color}
        opacity={0.92}
      />
      <Circle cx={toX} cy={toY} r={splashRadius} color={color} opacity={splashOpacity} />
    </Canvas>
  );
}
