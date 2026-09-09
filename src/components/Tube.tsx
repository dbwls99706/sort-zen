import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, Path } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { hiddenLayerCount } from '../core/rules';
import {
  LAYER_HEIGHT,
  makeOutlinePath,
  TUBE_CONTAINER_TOP_GAP,
  TUBE_HEIGHT,
  TUBE_WIDTH,
} from './tube/geometry';
import { TubeLiquid } from './tube/TubeLiquid';
import { useTubeMotion } from './tube/useTubeMotion';
import type { TubeProps } from './tube/types';

export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/geometry';
export type { TubePourPreview } from './tube/types';
const RIPPLE_MS = 560;

export const TubeComponent = memo(function TubeComponent(props: TubeProps) {
  const {
    tube,
    selected,
    completed,
    hinted = false,
    celebrating = false,
    celebrationDelayMs = 0,
    pourPreview,
    onPress,
    accessibilityLabel,
  } = props;
  const theme = useTheme();
  const pop = useSharedValue(1);
  const ripple = useSharedValue(1);
  const previousCount = useRef(tube.layers.length);
  const wasCompleted = useRef(completed);
  const outline = useMemo(() => makeOutlinePath(), []);
  const motion = useTubeMotion(props, pop);
  const hiddenCount = hiddenLayerCount(tube);
  const topColor =
    theme.colors[tube.layers[tube.layers.length - 1] % theme.colors.length] ?? theme.accent;

  useEffect(() => {
    if (selected || previousCount.current !== tube.layers.length) {
      ripple.value = 0;
      ripple.value = withTiming(1, { duration: RIPPLE_MS, easing: Easing.linear });
    }
    previousCount.current = tube.layers.length;
  }, [tube.layers.length, selected, ripple]);

  useEffect(() => {
    if ((completed && !wasCompleted.current) || (celebrating && completed)) {
      pop.value = withDelay(
        celebrating ? celebrationDelayMs : 0,
        withSequence(
          withTiming(1.08, { duration: 110 }),
          withSpring(1, { damping: 14, stiffness: 240 }),
        ),
      );
    }
    wasCompleted.current = completed;
  }, [completed, celebrating, celebrationDelayMs, pop]);

  return (
    <Pressable
      onPress={() => onPress(tube.id)}
      style={styles.hitTarget}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <View
        pointerEvents="none"
        style={[
          styles.selectionMark,
          { backgroundColor: selected ? theme.accentInk : 'transparent' },
        ]}
      />
      <Animated.View pointerEvents="none" style={[styles.container, motion]}>
        <Canvas style={styles.canvas} pointerEvents="none">
          <TubeLiquid tube={tube} ripple={ripple} pourPreview={pourPreview} />
          {(completed || hinted || selected) && (
            <Path
              path={outline}
              style="stroke"
              strokeWidth={5}
              color={completed ? topColor : theme.accent}
              opacity={0.2}
              strokeCap="round"
            />
          )}
          <Path
            path={outline}
            style="stroke"
            strokeWidth={2.5}
            color={completed ? topColor : selected || hinted ? theme.accentInk : theme.tubeOutline}
            strokeCap="round"
          />
          <Path
            path={outline}
            style="stroke"
            strokeWidth={0.7}
            color="rgba(255,255,255,0.5)"
            strokeCap="round"
          />
        </Canvas>
        {Array.from({ length: hiddenCount }, (_, index) => (
          <Text
            key={index}
            style={[styles.hiddenMark, { bottom: index * LAYER_HEIGHT + (LAYER_HEIGHT - 18) / 2 }]}
          >
            ?
          </Text>
        ))}
        {completed && (
          <View style={[styles.completeBadge, { backgroundColor: topColor }]}>
            <Text style={styles.check}>✓</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hitTarget: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP,
    overflow: 'visible',
  },
  container: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  canvas: { width: TUBE_WIDTH, height: TUBE_HEIGHT },
  selectionMark: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    bottom: -5,
  },
  hiddenMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  completeBadge: {
    position: 'absolute',
    top: TUBE_CONTAINER_TOP_GAP - 14,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  check: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
