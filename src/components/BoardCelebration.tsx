import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { prand } from '../utils/prand';
import { CLEAR_BOARD_CELEBRATION_MS } from './pourTiming';

type Spark = {
  angle: number;
  distance: number;
  size: number;
  rotation: number;
  delay: number;
  color: string;
  round: boolean;
};

type BoardCelebrationProps = {
  visible: boolean;
  colors: string[];
  seed: number;
};

function SparkPiece({
  progress,
  spark,
}: {
  progress: SharedValue<number>;
  spark: Spark;
}) {
  const style = useAnimatedStyle(() => {
    const local = Math.max(
      0,
      Math.min(1, (progress.value - spark.delay) / (1 - spark.delay)),
    );
    const burst = Easing.out(Easing.cubic)(local);
    return {
      opacity: local <= 0 ? 0 : Math.max(0, 1 - local * 1.08),
      transform: [
        { translateX: Math.cos(spark.angle) * spark.distance * burst },
        {
          translateY:
            Math.sin(spark.angle) * spark.distance * burst +
            55 * local * local,
        },
        { rotate: `${spark.rotation * local}rad` },
        { scale: 0.45 + Math.sin(local * Math.PI) * 0.9 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          width: spark.size,
          height: spark.round ? spark.size : spark.size * 0.48,
          borderRadius: spark.round ? spark.size / 2 : 2,
          backgroundColor: spark.color,
          marginLeft: -spark.size / 2,
          marginTop: -spark.size / 2,
        },
        style,
      ]}
    />
  );
}

/** 결과 모달 전에 보드 자체가 한 번 숨 쉬고 터지는 짧은 완성 연출. */
export function BoardCelebration({
  visible,
  colors,
  seed,
}: BoardCelebrationProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: CLEAR_BOARD_CELEBRATION_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, progress]);

  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        angle: -Math.PI + prand(i + seed * 17, 1) * Math.PI * 2,
        distance: 90 + prand(i + seed * 19, 2) * 210,
        size: 5 + prand(i + seed * 23, 3) * 10,
        rotation: (prand(i + seed * 29, 4) * 6 - 3) * Math.PI,
        delay: prand(i + seed * 31, 5) * 0.12,
        color: colors[(i + seed) % colors.length],
        round: i % 3 === 0,
      })),
    [colors, seed],
  );

  const flashStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.23 : 0,
    };
  });
  const ringStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const local = Math.min(1, t / 0.72);
    return {
      opacity: Math.max(0, 0.72 - local * 0.72),
      transform: [{ scale: 0.25 + local * 3.1 }],
    };
  });
  const innerRingStyle = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - 0.08) / 0.7));
    return {
      opacity: Math.max(0, 0.58 - t * 0.58),
      transform: [{ scale: 0.2 + t * 2.35 }],
    };
  });

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.flash, flashStyle]} />
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, ringStyle, { borderColor: colors[0] }]}
        />
        <Animated.View
          style={[
            styles.innerRing,
            innerRingStyle,
            { borderColor: colors[Math.min(2, colors.length - 1)] },
          ]}
        />
        {sparks.map((spark, index) => (
          <SparkPiece key={index} progress={progress} spark={spark} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  center: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 3,
  },
  innerRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    marginLeft: -43,
    marginTop: -43,
    borderRadius: 43,
    borderWidth: 2,
  },
  spark: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
