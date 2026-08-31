import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getPourTiming, getStreamProgress } from './pourTiming';

const BASE_DROP_SIZE = 10;

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

type DropProps = {
  index: number;
  count: number;
  progress: SharedValue<number>;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  scale: number;
  timing: ReturnType<typeof getPourTiming>;
};

function Drop({
  index,
  count,
  progress,
  fromX,
  fromY,
  toX,
  toY,
  color,
  scale,
  timing,
}: DropProps) {
  const style = useAnimatedStyle(() => {
    const stream = getStreamProgress(progress.value, timing);
    const delay = (index / count) * 0.42;
    const t = Math.max(0, Math.min(1, (stream - delay) / 0.58));
    const fall = t * t * 0.55 + t * 0.45;
    const x = fromX + (toX - fromX) * t;
    const y =
      fromY +
      (toY - fromY) * fall -
      Math.sin(t * Math.PI) * 30 * scale;
    const size = BASE_DROP_SIZE * scale * (1 - t * 0.25);

    return {
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size * 1.25,
      borderRadius: size,
      opacity: t > 0 && t < 1 ? 1 : 0,
    };
  });

  return (
    <Animated.View style={[styles.drop, { backgroundColor: color }, style]} />
  );
}

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
  const timing = React.useMemo(() => getPourTiming(layerCount), [layerCount]);
  const dropCount = 14 + timing.layerCount * 3;

  React.useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: timing.totalMs,
      easing: Easing.bezier(0.3, 0, 0.2, 1),
    });

    const streamTimer = onStreamStart
      ? setTimeout(onStreamStart, timing.streamStartMs)
      : null;
    const impactTimer = onImpact ? setTimeout(onImpact, timing.impactMs) : null;
    const completeTimer = setTimeout(onComplete, timing.totalMs);

    return () => {
      if (streamTimer) clearTimeout(streamTimer);
      if (impactTimer) clearTimeout(impactTimer);
      clearTimeout(completeTimer);
    };
  }, [progress, timing, onStreamStart, onImpact, onComplete]);

  const splashStyle = useAnimatedStyle(() => {
    const stream = getStreamProgress(progress.value, timing);
    const t = Math.max(0, Math.min(1, (stream - 0.58) / 0.42));
    const size = (12 + 38 * t) * scale;
    return {
      left: toX - size / 2,
      top: toY - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: t > 0 ? (1 - t) * 0.8 : 0,
      borderWidth: 2 * scale,
      borderColor: color,
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: dropCount }, (_, index) => (
        <Drop
          key={index}
          index={index}
          count={dropCount}
          progress={progress}
          fromX={fromX}
          fromY={fromY}
          toX={toX}
          toY={toY}
          color={color}
          scale={scale}
          timing={timing}
        />
      ))}
      <Animated.View style={[styles.splash, splashStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
  },
  splash: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
