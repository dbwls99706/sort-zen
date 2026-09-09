import { useEffect } from 'react';
import {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TUBE_SELECTED_LIFT } from './dimensions';
import type { TubeProps } from './types';

const SELECT_MS = 120;

/** Visual motion never moves the Pressable; the pour uses its shared clock. */
export function useTubeMotion(
  {
    selected,
    pourPreview,
    tiltAngle = 0,
    translationX = 0,
    translationY = 0,
  }: Pick<TubeProps, 'selected' | 'pourPreview' | 'tiltAngle' | 'translationX' | 'translationY'>,
  pop: SharedValue<number>,
) {
  const lift = useSharedValue(0);
  const progress = pourPreview?.role === 'source' ? pourPreview.progress : undefined;
  const streamStart = pourPreview?.streamStartRatio ?? 1;
  const streamEnd = pourPreview?.streamEndRatio ?? 1;

  useEffect(() => {
    lift.value = progress
      ? 0
      : withTiming(selected ? -TUBE_SELECTED_LIFT : 0, {
          duration: SELECT_MS,
          easing: Easing.out(Easing.cubic),
        });
  }, [selected, progress, lift]);

  return useAnimatedStyle(() => {
    let x = 0;
    let y = lift.value;
    let angle = 0;
    if (progress) {
      const p = progress.value;
      const travel = Math.min(1, p / Math.max(0.0001, streamStart));
      const move = 1 - Math.pow(1 - travel, 3);
      const turn = Math.max(0, Math.min(1, (travel - 0.3) / 0.7));
      const rotate = turn * turn * (3 - 2 * turn);
      const returning = Math.max(0, (p - streamEnd) / Math.max(0.0001, 1 - streamEnd));
      const home = returning * returning * (3 - 2 * returning);
      x = translationX * move * (1 - home);
      y = (-TUBE_SELECTED_LIFT + translationY * move) * (1 - home);
      angle = tiltAngle * rotate * (1 - home);
    }
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${angle}deg` },
        { scale: pop.value },
      ],
    };
  });
}
