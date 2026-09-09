import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { getStreamProgress, getStreamWindow, POUR_STREAM_FILL_PHASE } from './pourTiming';
import { usePourTimeline } from './tube/usePourTimeline';

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
const BASE_STREAM_WIDTH = 5;
const SPLASH_RADIUS = 13;

export function PourAnimation(props: PourAnimationProps) {
  const { fromX, fromY, toX, toY, color, layerCount, progress, scale = 1 } = props;
  const timing = usePourTimeline(progress, layerCount, props);
  const width = (BASE_STREAM_WIDTH + Math.min(4, layerCount) * 0.7) * scale;
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const angle = Math.atan2(-(toX - fromX), toY - fromY);
  const streamStyle = useAnimatedStyle(() => {
    const stream = getStreamProgress(progress.value, timing);
    const { head, tail } = getStreamWindow(stream);
    const height = distance * (head - tail);
    const center = (head + tail) / 2;
    return {
      height,
      opacity: stream > 0 && stream < 1 ? 1 : 0,
      transform: [
        { translateX: fromX + (toX - fromX) * center - width / 2 },
        { translateY: fromY + (toY - fromY) * center - height / 2 },
        { rotate: `${angle}rad` },
      ],
    };
  });
  const splashStyle = useAnimatedStyle(() => {
    const stream = getStreamProgress(progress.value, timing);
    const t = Math.max(
      0,
      Math.min(1, (stream - POUR_STREAM_FILL_PHASE) / (1 - POUR_STREAM_FILL_PHASE)),
    );
    const size = (3 + t * SPLASH_RADIUS) * 2 * scale;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX: toX - size / 2 }, { translateY: toY - size / 2 }],
      opacity: t > 0 ? (1 - t) * 0.65 : 0,
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.stream,
          { width, borderRadius: width / 2, backgroundColor: color },
          streamStyle,
        ]}
      >
        <View style={styles.highlight} />
      </Animated.View>
      <Animated.View
        style={[styles.splash, { borderColor: color, borderWidth: 1.5 * scale }, splashStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stream: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '25%',
    width: '20%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  splash: { position: 'absolute', top: 0, left: 0 },
});
