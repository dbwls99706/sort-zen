import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { hiddenLayerCount } from '../core/rules';
import { getTransferProgress } from './pourTiming';
import { LAYER_HEIGHT, TUBE_CONTAINER_TOP_GAP, TUBE_HEIGHT, TUBE_WIDTH } from './tube/dimensions';
import { useTubeMotion } from './tube/useTubeMotion';
import type { TubeProps } from './tube/types';

export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/dimensions';
export type { TubePourPreview } from './tube/types';
const HIDDEN_COLOR = '#7E899C';

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
  const wasCompleted = useRef(completed);
  const motion = useTubeMotion(props, pop);
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

  const hiddenCount = hiddenLayerCount(tube);
  const progress = pourPreview?.progress;
  const start = pourPreview?.streamStartRatio ?? 0;
  const end = pourPreview?.streamEndRatio ?? 1;
  const count = pourPreview?.count ?? 0;
  const role = pourPreview?.role;
  const currentHeight = tube.layers.length * LAYER_HEIGHT;
  const liquidStyle = useAnimatedStyle(() => {
    const stream = progress ? (progress.value - start) / Math.max(0.0001, end - start) : 0;
    const removed =
      role === 'source' ? getTransferProgress(stream, 'source') * count * LAYER_HEIGHT : 0;
    return { height: Math.max(0, currentHeight - removed) };
  });
  const previewStyle = useAnimatedStyle(() => {
    const stream = progress ? (progress.value - start) / Math.max(0.0001, end - start) : 0;
    return {
      height: role === 'target' ? getTransferProgress(stream, 'target') * count * LAYER_HEIGHT : 0,
    };
  });
  const topColor =
    theme.colors[tube.layers[tube.layers.length - 1] % theme.colors.length] ?? theme.accent;
  const outline = completed ? topColor : selected || hinted ? theme.accent : theme.tubeOutline;

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
        style={[styles.selectionMark, { backgroundColor: selected ? theme.accent : 'transparent' }]}
      />
      <Animated.View pointerEvents="none" style={[styles.container, motion]}>
        <View
          style={[styles.tubeBody, { borderColor: outline, backgroundColor: theme.tubeBackground }]}
        >
          <Animated.View style={[styles.liquid, liquidStyle]}>
            {tube.layers.map((colorId, index) => (
              <View
                key={index}
                style={[
                  styles.layer,
                  {
                    bottom: index * LAYER_HEIGHT,
                    backgroundColor:
                      index < hiddenCount
                        ? HIDDEN_COLOR
                        : theme.colors[colorId % theme.colors.length],
                  },
                ]}
              >
                {index < hiddenCount && <Text style={styles.hiddenMark}>?</Text>}
              </View>
            ))}
          </Animated.View>
          {role === 'target' && (
            <Animated.View
              style={[
                styles.preview,
                { bottom: currentHeight, backgroundColor: pourPreview?.color },
                previewStyle,
              ]}
            />
          )}
          <View style={styles.glassHighlight} />
          <View style={styles.glassEdge} />
        </View>
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
  tubeBody: {
    width: TUBE_WIDTH - 8,
    height: TUBE_HEIGHT - 8,
    marginBottom: 4,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  liquid: { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  layer: {
    position: 'absolute',
    width: '100%',
    height: LAYER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  preview: { position: 'absolute', left: 0, right: 0 },
  glassHighlight: {
    position: 'absolute',
    top: 10,
    bottom: 12,
    left: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  glassEdge: {
    position: 'absolute',
    top: 14,
    bottom: 24,
    right: 3,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  selectionMark: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    bottom: -5,
  },
  hiddenMark: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
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
