import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Path,
} from '@shopify/react-native-skia';
import {
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { makeArcPath, trimmedStream } from './streamPath';
import {
  getPourTiming,
  getStreamProgress,
  POUR_STREAM_FILL_PHASE,
} from './pourTiming';

const ARC_LIFT = 44;
const BASE_STREAM_WIDTH = 7.5;
const BASE_SPLASH_RADIUS = 18;
const SPLASH_DROPS = 5;

type PourAnimationProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  layerCount: number;
  progress: SharedValue<number>;
  scale?: number;
  onStreamStart?: () => void;
  onImpact?: () => void;
  onComplete: () => void;
};

type SplashDropProps = {
  index: number;
  splash: SharedValue<number>;
  x: number;
  y: number;
  color: string;
  scale: number;
};

function SplashDrop({ index, splash, x, y, color, scale }: SplashDropProps) {
  const angle =
    -Math.PI * 0.9 +
    (index / Math.max(1, SPLASH_DROPS - 1)) * Math.PI * 0.8;
  const distance = (16 + index * 2.5) * scale;

  const cx = useDerivedValue(
    () => x + Math.cos(angle) * distance * splash.value,
  );
  const cy = useDerivedValue(() => {
    const t = splash.value;
    return y + Math.sin(angle) * distance * t + 20 * scale * t * t;
  });
  const radius = useDerivedValue(() =>
    splash.value > 0 && splash.value < 1
      ? (2.3 - splash.value * 1.2) * scale
      : 0,
  );
  const opacity = useDerivedValue(() =>
    Math.max(0, 0.75 - splash.value * 0.75),
  );

  return <Circle cx={cx} cy={cy} r={radius} color={color} opacity={opacity} />;
}

/**
 * 이동 → 기울기 → 연속 스트림 → 착지 스플래시 → 복귀를 하나의 진행도로 묶은 붓기 연출.
 * 실제 액체 높이 미리보기와 사운드·햅틱도 동일한 progress를 구독한다.
 */
export function PourAnimation({
  fromX,
  fromY,
  toX,
  toY,
  color,
  layerCount,
  progress,
  scale = 1,
  onStreamStart,
  onImpact,
  onComplete,
}: PourAnimationProps) {
  const timing = useMemo(() => getPourTiming(layerCount), [layerCount]);
  const arcLift =
    (ARC_LIFT + Math.min(3, timing.layerCount - 1) * 4) * scale;
  const streamWidth =
    (BASE_STREAM_WIDTH + Math.min(4, timing.layerCount) * 1.15) * scale;
  const splashMax =
    (BASE_SPLASH_RADIUS + Math.min(4, timing.layerCount) * 3) * scale;

  React.useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: timing.totalMs,
        easing: Easing.bezier(0.3, 0, 0.2, 1),
      },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, [progress, onComplete, timing.totalMs]);

  useAnimatedReaction(
    () => progress.value >= timing.streamStartRatio,
    (started, previous) => {
      if (started && !previous && onStreamStart) runOnJS(onStreamStart)();
    },
    [onStreamStart, timing.streamStartRatio],
  );

  useAnimatedReaction(
    () => progress.value >= timing.impactRatio,
    (impacted, previous) => {
      if (impacted && !previous && onImpact) runOnJS(onImpact)();
    },
    [onImpact, timing.impactRatio],
  );

  const basePath = useMemo(
    () => makeArcPath(fromX, fromY, toX, toY, arcLift),
    [fromX, fromY, toX, toY, arcLift],
  );

  const streamProgress = useDerivedValue(() =>
    getStreamProgress(progress.value, timing),
  );
  const streamPath = useDerivedValue(() =>
    trimmedStream(basePath, streamProgress.value, POUR_STREAM_FILL_PHASE),
  );
  const streamOpacity = useDerivedValue(() => {
    const t = streamProgress.value;
    if (t <= 0 || t >= 1) return 0;
    return Math.min(1, t * 7, (1 - t) * 8);
  });

  const glowOpacity = useDerivedValue(() => streamOpacity.value * 0.18);

  const splash = useDerivedValue(() => {
    const t = streamProgress.value;
    if (t < POUR_STREAM_FILL_PHASE) return 0;
    return Math.min(
      1,
      (t - POUR_STREAM_FILL_PHASE) / (1 - POUR_STREAM_FILL_PHASE),
    );
  });
  const splashRadius = useDerivedValue(() => {
    const t = splash.value;
    return t > 0 ? splashMax * Math.sin(t * Math.PI) : 0;
  });
  const splashOpacity = useDerivedValue(() =>
    splash.value > 0 ? Math.max(0, (1 - splash.value) * 0.82) : 0,
  );
  const innerSplashRadius = useDerivedValue(() => splashRadius.value * 0.58);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={streamPath}
        style="stroke"
        strokeWidth={streamWidth * 1.8}
        strokeCap="round"
        strokeJoin="round"
        color={color}
        opacity={glowOpacity}
      >
        <BlurMask blur={4 * scale} style="normal" />
      </Path>
      <Path
        path={streamPath}
        style="stroke"
        strokeWidth={streamWidth}
        strokeCap="round"
        strokeJoin="round"
        color={color}
        opacity={streamOpacity}
      />
      <Path
        path={streamPath}
        style="stroke"
        strokeWidth={Math.max(1, streamWidth * 0.24)}
        strokeCap="round"
        color="rgba(255,255,255,0.55)"
        opacity={streamOpacity}
      />

      <Circle
        cx={toX}
        cy={toY}
        r={splashRadius}
        style="stroke"
        strokeWidth={2.2 * scale}
        color={color}
        opacity={splashOpacity}
      />
      <Circle
        cx={toX}
        cy={toY}
        r={innerSplashRadius}
        style="stroke"
        strokeWidth={1.2 * scale}
        color="rgba(255,255,255,0.75)"
        opacity={splashOpacity}
      />
      {Array.from({ length: SPLASH_DROPS }, (_, index) => (
        <SplashDrop
          key={index}
          index={index}
          splash={splash}
          x={toX}
          y={toY}
          color={color}
          scale={scale}
        />
      ))}
    </Canvas>
  );
}
