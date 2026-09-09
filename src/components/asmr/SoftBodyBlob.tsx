import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  runOnJS,
} from 'react-native-reanimated';
import { Canvas, Path, Skia, RadialGradient, Circle, vec, Group } from '@shopify/react-native-skia';
import {
  buildSim,
  flattenNodes,
  stepSimulation,
  type BlobPhysics,
  type BlobShape,
  type Finger,
} from './blobPhysics';

export type { BlobPhysics, BlobShape } from './blobPhysics';

const PHYSICS_STEP_MS = 1000 / 60;
const MAX_CATCHUP_STEPS = 2;
const FEEDBACK_INTERVAL_MS = 64;
const SLEEP_MOTION_PX = 0.045;
const SLEEP_STABLE_FRAMES = 18;
const MAX_SETTLE_FRAMES = 360;

type Props = {
  size: number;
  outerColor: string;
  innerColor: string;
  physics: BlobPhysics;
  shape: BlobShape;
  resetKey: string;
  enabled?: boolean;
  accessibilityLabel?: string;
  onSqueezeStart: (x: number, y: number) => void;
  onSqueezeMove: (x: number, y: number, speed: number) => void;
  onRelease: () => void;
};

/** Physics, touch tracking and rendering stay on the UI thread. */
export const SoftBodyBlob = memo(function SoftBodyBlob({
  size,
  outerColor,
  innerColor,
  physics,
  shape,
  resetKey,
  enabled = true,
  accessibilityLabel,
  onSqueezeStart,
  onSqueezeMove,
  onRelease,
}: Props) {
  const R = size * 0.3;
  const initialSim = useMemo(() => buildSim(shape, R, size / 2, size / 2), [shape, R, size]);
  const sim = useSharedValue(initialSim);
  const fingersSV = useSharedValue<Finger[]>([]);
  const posSV = useSharedValue(flattenNodes(initialSim.nodes));
  const awake = useSharedValue(true);
  const touching = useSharedValue(false);
  const accumulator = useSharedValue(0);
  const stableFrames = useSharedValue(0);
  const settleFrames = useSharedValue(0);
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);
  const lastFeedbackTime = useSharedValue(0);
  const releaseTouches = useCallback(() => {
    fingersSV.value = [];
    if (touching.value) {
      touching.value = false;
      onRelease();
    }
  }, [fingersSV, touching, onRelease]);

  useEffect(() => {
    releaseTouches();
    sim.value = initialSim;
    posSV.value = flattenNodes(initialSim.nodes);
    fingersSV.value = [];
    touching.value = false;
    stableFrames.value = 0;
    settleFrames.value = 0;
    awake.value = true;
    accumulator.value = 0;
    return releaseTouches;
  }, [
    initialSim,
    resetKey,
    sim,
    posSV,
    fingersSV,
    touching,
    stableFrames,
    settleFrames,
    awake,
    accumulator,
    releaseTouches,
  ]);

  const frame = useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';
    if (!awake.value) return;
    accumulator.value = Math.min(
      accumulator.value + (timeSincePreviousFrame ?? PHYSICS_STEP_MS),
      PHYSICS_STEP_MS * MAX_CATCHUP_STEPS,
    );
    if (accumulator.value < PHYSICS_STEP_MS) return;

    sim.modify((current) => {
      'worklet';
      let motion = 0;
      while (accumulator.value >= PHYSICS_STEP_MS) {
        motion = stepSimulation(current, physics, fingersSV.value, size);
        accumulator.value -= PHYSICS_STEP_MS;
      }
      posSV.value = flattenNodes(current.nodes);
      if (fingersSV.value.length === 0) {
        settleFrames.value += 1;
        stableFrames.value = motion < SLEEP_MOTION_PX ? stableFrames.value + 1 : 0;
        if (stableFrames.value >= SLEEP_STABLE_FRAMES || settleFrames.value >= MAX_SETTLE_FRAMES) {
          awake.value = false;
        }
      } else {
        stableFrames.value = 0;
        settleFrames.value = 0;
      }
      return current;
    });
  }, false);

  useEffect(() => {
    frame.setActive(enabled);
    if (!enabled) {
      releaseTouches();
    } else {
      awake.value = true;
      accumulator.value = 0;
    }
    return () => frame.setActive(false);
  }, [enabled, frame, releaseTouches, awake, accumulator]);

  // UI 스레드에서 재사용 SkPath에 Catmull-Rom 곡선을 매 프레임 갱신 (할당/리렌더 없음)
  const skPath = useMemo(() => Skia.Path.Make(), []);
  const animatedPath = useDerivedValue(() => {
    const a = posSV.value;
    const m = a.length / 2;
    skPath.reset();
    const px = (i: number) => a[(((i % m) + m) % m) * 2];
    const py = (i: number) => a[(((i % m) + m) % m) * 2 + 1];
    skPath.moveTo(px(0), py(0));
    for (let i = 0; i < m; i++) {
      skPath.cubicTo(
        px(i) + (px(i + 1) - px(i - 1)) / 6,
        py(i) + (py(i + 1) - py(i - 1)) / 6,
        px(i + 1) - (px(i + 2) - px(i)) / 6,
        py(i + 1) - (py(i + 2) - py(i)) / 6,
        px(i + 1),
        py(i + 1),
      );
    }
    skPath.close();
    return skPath;
  }, [skPath, posSV]);

  // 블롭 중심(그라디언트·하이라이트용)
  const gradC = useDerivedValue(() => {
    const a = posSV.value;
    const m = a.length / 2;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < m; i++) {
      mx += a[i * 2];
      my += a[i * 2 + 1];
    }
    mx /= m;
    my /= m;
    return vec(mx - R * 0.3, my - R * 0.3);
  }, [posSV, R]);
  const hlX = useDerivedValue(() => gradC.value.x - R * 0.02, [gradC, R]);
  const hlY = useDerivedValue(() => gradC.value.y - R * 0.04, [gradC, R]);

  const gesture = useMemo(
    () =>
      Gesture.Manual()
        .enabled(enabled)
        .onTouchesDown((e, manager) => {
          'worklet';
          fingersSV.value = e.allTouches.map((touch) => ({ x: touch.x, y: touch.y }));
          awake.value = true;
          stableFrames.value = 0;
          settleFrames.value = 0;
          const touch = e.allTouches[0];
          if (touch && !touching.value) {
            touching.value = true;
            prevX.value = touch.x;
            prevY.value = touch.y;
            lastFeedbackTime.value = Date.now();
            runOnJS(onSqueezeStart)(touch.x, touch.y);
          }
          if (e.numberOfTouches >= 1) manager.activate();
        })
        .onTouchesMove((e) => {
          'worklet';
          fingersSV.value = e.allTouches.map((touch) => ({ x: touch.x, y: touch.y }));
          const touch = e.allTouches[0];
          const now = Date.now();
          const elapsed = now - lastFeedbackTime.value;
          if (!touch || elapsed < FEEDBACK_INTERVAL_MS) return;
          // Normalize velocity to a 60 Hz step, independent of touch sampling rate.
          const speed =
            (Math.hypot(touch.x - prevX.value, touch.y - prevY.value) * PHYSICS_STEP_MS) /
            Math.max(PHYSICS_STEP_MS, elapsed);
          prevX.value = touch.x;
          prevY.value = touch.y;
          lastFeedbackTime.value = now;
          runOnJS(onSqueezeMove)(touch.x, touch.y, speed);
        })
        .onTouchesUp((e, manager) => {
          'worklet';
          const remaining = e.allTouches.filter(
            (touch) => !e.changedTouches.some((changed) => changed.id === touch.id),
          );
          fingersSV.value = remaining.map((touch) => ({ x: touch.x, y: touch.y }));
          // Changing the leading finger must not look like a fast swipe.
          if (remaining[0]) {
            prevX.value = remaining[0].x;
            prevY.value = remaining[0].y;
            lastFeedbackTime.value = Date.now();
          } else {
            manager.end();
          }
        })
        .onTouchesCancelled((_e, manager) => {
          'worklet';
          manager.end();
        })
        .onFinalize(() => {
          'worklet';
          fingersSV.value = [];
          awake.value = true;
          if (touching.value) {
            touching.value = false;
            runOnJS(onRelease)();
          }
        }),
    [
      enabled,
      onSqueezeStart,
      onSqueezeMove,
      onRelease,
      fingersSV,
      prevX,
      prevY,
      lastFeedbackTime,
      awake,
      touching,
      stableFrames,
      settleFrames,
    ],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={{ width: size, height: size }}
      >
        <Canvas style={{ width: size, height: size }} pointerEvents="none">
          <Group>
            <Path path={animatedPath}>
              <RadialGradient c={gradC} r={R * 1.6} colors={[innerColor, outerColor]} />
            </Path>
            <Circle cx={hlX} cy={hlY} r={R * 0.18} color="rgba(255,255,255,0.5)" />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
});
