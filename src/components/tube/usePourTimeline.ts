import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  withTiming,
} from 'react-native-reanimated';
import { getPourTiming } from '../pourTiming';

type Callbacks = { onStreamStart?: () => void; onImpact?: () => void; onComplete: () => void };

/** Callback changes must not restart an in-flight pour. */
export function usePourTimeline(
  progress: SharedValue<number>,
  layerCount: number,
  callbacks: Callbacks,
) {
  const timing = useMemo(() => getPourTiming(layerCount), [layerCount]);
  const callbacksRef = useRef(callbacks);
  const mounted = useRef(false);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  const streamStarted = useCallback(() => {
    if (mounted.current) callbacksRef.current.onStreamStart?.();
  }, []);
  const impacted = useCallback(() => {
    if (mounted.current) callbacksRef.current.onImpact?.();
  }, []);
  const complete = useCallback(() => {
    if (mounted.current) callbacksRef.current.onComplete();
  }, []);

  useEffect(() => {
    mounted.current = true;
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: timing.totalMs, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(complete)();
      },
    );
    return () => {
      mounted.current = false;
      cancelAnimation(progress);
    };
  }, [progress, timing.totalMs, complete]);

  useAnimatedReaction(
    () => progress.value >= timing.streamStartRatio,
    (started, previous) => {
      if (started && !previous) runOnJS(streamStarted)();
    },
    [timing.streamStartRatio, streamStarted],
  );
  useAnimatedReaction(
    () => progress.value >= timing.impactRatio,
    (hit, previous) => {
      if (hit && !previous) runOnJS(impacted)();
    },
    [timing.impactRatio, impacted],
  );
  return timing;
}
