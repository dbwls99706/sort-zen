import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { hiddenLayerCount } from '../core/rules';
import {
  LAYER_HEIGHT,
  TUBE_CONTAINER_TOP_GAP,
  TUBE_HEIGHT,
  TUBE_SELECTED_LIFT,
  TUBE_WIDTH,
} from './tube/dimensions';

export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/dimensions';

const SELECTED_OFFSET = -TUBE_SELECTED_LIFT;
const RETURN_SPRING = { damping: 18, stiffness: 170 };
const HIDDEN_COLOR = '#9aa0aa';

export type TubePourPreview = {
  role: 'source' | 'target';
  color: string;
  count: number;
  progress: SharedValue<number>;
  streamStartRatio: number;
  streamEndRatio: number;
};

type TubeProps = {
  tube: TubeType;
  selected: boolean;
  completed: boolean;
  hinted?: boolean;
  celebrating?: boolean;
  celebrationDelayMs?: number;
  pourPreview?: TubePourPreview;
  onPress: () => void;
  tiltAngle?: number;
  translationX?: number;
  translationY?: number;
};

export function TubeComponent({
  tube,
  selected,
  completed,
  hinted = false,
  celebrating = false,
  celebrationDelayMs = 0,
  pourPreview,
  onPress,
  tiltAngle = 0,
  translationX = 0,
  translationY = 0,
}: TubeProps) {
  const theme = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rotation = useSharedValue(0);
  const pop = useSharedValue(1);

  React.useEffect(() => {
    const targetY = (selected ? SELECTED_OFFSET : 0) + translationY;
    const pouring = Math.abs(tiltAngle) > 0.1;
    if (pouring) {
      tx.value = withDelay(
        35,
        withTiming(translationX, {
          duration: 225,
          easing: Easing.out(Easing.cubic),
        }),
      );
      ty.value = withDelay(
        35,
        withTiming(targetY, {
          duration: 225,
          easing: Easing.out(Easing.cubic),
        }),
      );
      rotation.value = withDelay(
        225,
        withTiming(tiltAngle, {
          duration: 105,
          easing: Easing.out(Easing.quad),
        }),
      );
    } else {
      tx.value = withSpring(translationX, RETURN_SPRING);
      ty.value = withSpring(targetY, RETURN_SPRING);
      rotation.value = withSpring(tiltAngle, RETURN_SPRING);
    }
  }, [selected, tiltAngle, translationX, translationY, tx, ty, rotation]);

  const wasCompleted = React.useRef(false);
  React.useEffect(() => {
    if (completed && !wasCompleted.current) {
      pop.value = withSequence(
        withTiming(1.09, { duration: 130 }),
        withSpring(1, { damping: 8, stiffness: 230 }),
      );
    }
    wasCompleted.current = completed;
  }, [completed, pop]);

  React.useEffect(() => {
    if (!celebrating || !completed) return;
    pop.value = withDelay(
      celebrationDelayMs,
      withSequence(
        withTiming(1.14, { duration: 110 }),
        withTiming(0.97, { duration: 90 }),
        withSpring(1, { damping: 7, stiffness: 240 }),
      ),
    );
  }, [celebrating, completed, celebrationDelayMs, pop]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rotation.value}deg` },
      { scale: pop.value },
    ],
  }));

  const hiddenCount = hiddenLayerCount(tube);
  const reversedLayers = [...tube.layers].reverse();
  const lastIndex = tube.layers.length - 1;
  const previewProgress = pourPreview?.progress;
  const previewStart = pourPreview?.streamStartRatio ?? 0;
  const previewEnd = pourPreview?.streamEndRatio ?? 1;
  const previewHeight = useAnimatedStyle(() => {
    if (!previewProgress || !pourPreview) return { height: 0 };
    const p = Math.max(
      0,
      Math.min(
        1,
        (previewProgress.value - previewStart) /
          Math.max(0.0001, previewEnd - previewStart),
      ),
    );
    return { height: p * pourPreview.count * LAYER_HEIGHT };
  }, [previewProgress, pourPreview, previewStart, previewEnd]);

  const currentLiquidHeight = tube.layers.length * LAYER_HEIGHT;
  const sourceTop = TUBE_HEIGHT - currentLiquidHeight;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          style={[
            styles.tubeBody,
            {
              borderColor: completed
                ? theme.colors[tube.layers[lastIndex] % theme.colors.length]
                : hinted
                  ? theme.accent
                  : theme.tubeOutline,
              borderWidth: completed ? 3.5 : 2.5,
              backgroundColor: theme.tubeBackground || 'transparent',
            },
          ]}
        >
          {reversedLayers.map((colorId, index) => {
            const layerIndex = lastIndex - index;
            const hidden = layerIndex < hiddenCount;
            const color = hidden
              ? HIDDEN_COLOR
              : theme.colors[colorId % theme.colors.length];
            return (
              <View
                key={`${tube.id}-${index}`}
                style={[
                  styles.layer,
                  { backgroundColor: color, height: LAYER_HEIGHT },
                ]}
              >
                {hidden && <Text style={styles.hiddenMark}>?</Text>}
              </View>
            );
          })}

          {pourPreview?.role === 'source' && (
            <Animated.View
              style={[
                styles.preview,
                {
                  top: sourceTop,
                  backgroundColor: theme.tubeBackground,
                },
                previewHeight,
              ]}
            />
          )}
          {pourPreview?.role === 'target' && (
            <Animated.View
              style={[
                styles.preview,
                {
                  bottom: currentLiquidHeight,
                  backgroundColor: pourPreview.color,
                },
                previewHeight,
              ]}
            />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tubeBody: {
    position: 'relative',
    width: TUBE_WIDTH - 8,
    height: TUBE_HEIGHT,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  layer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 4,
  },
  hiddenMark: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
