import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const POUR_DURATION_MS = 600;

type PourAnimationProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  onComplete: () => void;
};

export function PourAnimation({
  fromX,
  fromY,
  toX,
  toY,
  color,
  onComplete,
}: PourAnimationProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: POUR_DURATION_MS, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      },
    );
  }, [progress, onComplete]);

  const dropStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const x = fromX + (toX - fromX) * t;
    const arcHeight = -80;
    const y = fromY + (toY - fromY) * t + arcHeight * Math.sin(t * Math.PI);

    return {
      position: 'absolute',
      left: x - 8,
      top: y - 8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: color,
      opacity: 1 - t * 0.3,
    };
  });

  return (
    <View style={styles.overlay} pointerEvents="box-only">
      <Animated.View style={dropStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
