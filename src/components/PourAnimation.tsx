import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

export const POUR_DURATION_MS = 700;
const NUM_DROPLETS = 6;

export type PourAnimationProps = {
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
      { duration: POUR_DURATION_MS, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, [progress, onComplete]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_DROPLETS }).map((_, i) => {
        return (
          <Droplet
            key={i}
            index={i}
            progress={progress}
            fromX={fromX}
            fromY={fromY}
            toX={toX}
            toY={toY}
            color={color}
          />
        );
      })}
    </View>
  );
}

type DropletProps = {
  index: number;
  progress: Animated.SharedValue<number>;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
};

function Droplet({ index, progress, fromX, fromY, toX, toY, color }: DropletProps) {
  const dropletStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const delay = index * 0.08;
    const duration = 0.5;
    
    // Normalize progress for this specific droplet
    let t = (p - delay) / duration;
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    const x = fromX + (toX - fromX) * t;
    // Curved arc paths for natural gravity fall
    const arcHeight = -30;
    const y = fromY + (toY - fromY) * t + arcHeight * Math.sin(t * Math.PI);

    // Fade in/out at edges
    const opacity = t > 0 && t < 1 ? 1 : 0;
    // Staggered scale (dripping shape)
    const scale = t > 0 && t < 1 ? 1 - t * 0.3 : 0;

    return {
      position: 'absolute',
      left: x - 6,
      top: y - 6,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: color,
      opacity,
      transform: [{ scale }],
    };
  });

  return <Animated.View style={dropletStyle} />;
}
