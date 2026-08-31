import React, { useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { hiddenLayerCount } from '../core/rules';
import { darken, lighten } from '../utils/color';
import {
  LAYER_HEIGHT,
  makeClipPath,
  makeOutlinePath,
  TUBE_CONTAINER_TOP_GAP,
  TUBE_HEIGHT,
  TUBE_SELECTED_LIFT,
  TUBE_WIDTH,
} from './tube/geometry';

export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/geometry';

const WAVE_AMPLITUDE = 3;
const WAVE_STEPS = 12;
const WAVE_SURGE_AMPLITUDE = 5;
const WAVE_SURGE_DECAY_MS = 900;
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

  const pop = useSharedValue(1);
  const celebrationGlow = useSharedValue(0);
  const wasCompleted = React.useRef(false);

  React.useEffect(() => {
    if (completed && !wasCompleted.current) {
      pop.value = withSequence(
        withTiming(1.09, {
          duration: 130,
          easing: Easing.out(Easing.quad),
        }),
        withSpring(1, { damping: 8, stiffness: 230 }),
      );
    }
    wasCompleted.current = completed;
  }, [completed, pop]);

  React.useEffect(() => {
    if (!celebrating || !completed) {
      celebrationGlow.value = 0;
      return;
    }
    pop.value = withDelay(
      celebrationDelayMs,
      withSequence(
        withTiming(1.14, {
          duration: 110,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.97, { duration: 90 }),
        withSpring(1, { damping: 7, stiffness: 240 }),
      ),
    );
    celebrationGlow.value = withDelay(
      celebrationDelayMs,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, {
          duration: 720,
          easing: Easing.out(Easing.quad),
        }),
      ),
    );
  }, [celebrating, completed, celebrationDelayMs, pop, celebrationGlow]);

  // 튜브 이동과 회전을 순차화한다. 이동이 끝나기 전에 허공에서 액체가 생기지 않도록
  // 먼저 대상 위로 이동한 뒤 기울이고, 해제 시에는 자연스럽게 원위치로 돌아간다.
  const translateXValue = useSharedValue(0);
  const translateYValue = useSharedValue(0);
  const rotateValue = useSharedValue(0);
  React.useEffect(() => {
    const targetY = (selected ? SELECTED_OFFSET : 0) + translationY;
    const isPouring = Math.abs(tiltAngle) > 0.1;

    if (isPouring) {
      translateXValue.value = withDelay(
        35,
        withTiming(translationX, {
          duration: 225,
          easing: Easing.out(Easing.cubic),
        }),
      );
      translateYValue.value = withDelay(
        35,
        withTiming(targetY, {
          duration: 225,
          easing: Easing.out(Easing.cubic),
        }),
      );
      rotateValue.value = withDelay(
        225,
        withTiming(tiltAngle, {
          duration: 105,
          easing: Easing.out(Easing.quad),
        }),
      );
    } else {
      translateXValue.value = withSpring(translationX, RETURN_SPRING);
      translateYValue.value = withSpring(targetY, RETURN_SPRING);
      rotateValue.value = withSpring(tiltAngle, RETURN_SPRING);
    }
  }, [
    selected,
    tiltAngle,
    translationX,
    translationY,
    translateXValue,
    translateYValue,
    rotateValue,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateXValue.value },
      { translateY: translateYValue.value },
      { rotate: `${rotateValue.value}deg` },
      { scale: pop.value },
    ],
  }));

  const wavePhase = useSharedValue(0);
  React.useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2500, easing: Easing.linear }),
      -1,
      false,
    );
  }, [wavePhase]);

  const surge = useSharedValue(0);
  const prevLayerCount = React.useRef(tube.layers.length);
  React.useEffect(() => {
    if (tube.layers.length !== prevLayerCount.current) {
      surge.value = 1;
      surge.value = withTiming(0, {
        duration: WAVE_SURGE_DECAY_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    prevLayerCount.current = tube.layers.length;
  }, [tube.layers.length, surge]);

  const hintPulse = useSharedValue(0);
  React.useEffect(() => {
    if (hinted) {
      hintPulse.value = withRepeat(
        withTiming(1, {
          duration: 600,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(hintPulse);
      hintPulse.value = 0;
    }
  }, [hinted, hintPulse]);
  const hintOpacity = useDerivedValue(() => 0.45 + hintPulse.value * 0.55);
  const celebrationOpacity = useDerivedValue(
    () => celebrationGlow.value * 0.95,
  );

  const clipPath = useMemo(() => makeClipPath(), []);
  const outlinePath = useMemo(() => makeOutlinePath(), []);
  const surfacePath = useMemo(() => Skia.Path.Make(), []);

  const layersCount = tube.layers.length;
  const topIndex = layersCount - 1;
  const hiddenCount = hiddenLayerCount(tube);

  const runs = useMemo(() => {
    const out: {
      colorId: number;
      start: number;
      count: number;
      hidden: boolean;
    }[] = [];
    for (let i = 0; i < tube.layers.length; i++) {
      const hidden = i < hiddenCount;
      const colorId = tube.layers[i];
      const last = out[out.length - 1];
      if (
        last &&
        last.hidden === hidden &&
        (hidden || last.colorId === colorId)
      ) {
        last.count += 1;
      } else {
        out.push({ colorId, start: i, count: 1, hidden });
      }
    }
    return out;
  }, [tube.layers, hiddenCount]);

  const topRunStart = runs.length > 0 ? runs[runs.length - 1].start : 0;
  const underRuns = runs.slice(0, -1);

  const wavyTopPath = useDerivedValue(() => {
    const path = surfacePath;
    path.reset();
    if (layersCount === 0) return path;

    const y = TUBE_HEIGHT - layersCount * LAYER_HEIGHT;
    const bandBottom = TUBE_HEIGHT - topRunStart * LAYER_HEIGHT;
    const left = 5;
    const right = TUBE_WIDTH - 5;
    const stepWidth = (right - left) / WAVE_STEPS;
    const phase = wavePhase.value;
    const amplitude = WAVE_AMPLITUDE + surge.value * WAVE_SURGE_AMPLITUDE;

    path.moveTo(left, bandBottom);
    path.lineTo(left, y + Math.sin(phase) * amplitude);
    for (let i = 1; i <= WAVE_STEPS; i++) {
      const x = left + i * stepWidth;
      const t = i / WAVE_STEPS;
      path.lineTo(x, y + Math.sin(phase + t * Math.PI * 2) * amplitude);
    }
    path.lineTo(right, bandBottom);
    path.close();
    return path;
  });

  const topColor =
    layersCount > 0
      ? theme.colors[tube.layers[topIndex] % theme.colors.length]
      : theme.tubeBackground;

  const liquidTop = TUBE_HEIGHT - layersCount * LAYER_HEIGHT + 4;
  const liquidBottom = TUBE_HEIGHT - 8;
  const bubbleA = useDerivedValue(() => {
    const p = wavePhase.value / (2 * Math.PI);
    return liquidBottom - p * (liquidBottom - liquidTop);
  });
  const bubbleB = useDerivedValue(() => {
    const p = (wavePhase.value / (2 * Math.PI) + 0.5) % 1;
    return liquidBottom - p * (liquidBottom - liquidTop);
  });

  // 붓는 동안 논리 상태가 아직 커밋되지 않아도 출발 액체는 줄고 대상 액체는 찬다.
  const previewProgress = pourPreview?.progress;
  const previewStart = pourPreview?.streamStartRatio ?? 0;
  const previewEnd = pourPreview?.streamEndRatio ?? 1;
  const previewCount = pourPreview?.count ?? 0;
  const previewRole = pourPreview?.role;
  const previewColor = pourPreview?.color ?? topColor;
  const transferRatio = useDerivedValue(() => {
    if (!previewProgress || !previewRole) return 0;
    const p = previewProgress.value;
    if (p <= previewStart) return 0;
    if (p >= previewEnd) return 1;
    return (p - previewStart) / Math.max(0.0001, previewEnd - previewStart);
  }, [previewProgress, previewRole, previewStart, previewEnd]);
  const transferHeight = useDerivedValue(
    () => transferRatio.value * previewCount * LAYER_HEIGHT,
  );
  const targetPreviewY = useDerivedValue(
    () => TUBE_HEIGHT - layersCount * LAYER_HEIGHT - transferHeight.value,
  );
  const sourceMaskHeight = useDerivedValue(() =>
    transferHeight.value > 0 ? transferHeight.value + 6 : 0,
  );
  const sourceMaskY = TUBE_HEIGHT - layersCount * LAYER_HEIGHT - 6;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={styles.canvas}>
          <Group clip={clipPath}>
            <RoundedRect
              x={6}
              y={6}
              width={TUBE_WIDTH - 12}
              height={TUBE_HEIGHT - 12}
              r={0}
              color={theme.tubeBackground}
            />

            {underRuns.map((run) => {
              const top =
                TUBE_HEIGHT - (run.start + run.count) * LAYER_HEIGHT;
              const height = run.count * LAYER_HEIGHT;
              const base = run.hidden
                ? HIDDEN_COLOR
                : theme.colors[run.colorId % theme.colors.length];
              return (
                <RoundedRect
                  key={`${tube.id}-r${run.start}`}
                  x={5}
                  y={top - 1}
                  width={TUBE_WIDTH - 10}
                  height={height + 2}
                  r={0}
                >
                  <LinearGradient
                    start={vec(0, top)}
                    end={vec(0, top + height)}
                    colors={[lighten(base, 0.22), base, darken(base, 0.06)]}
                  />
                </RoundedRect>
              );
            })}

            {layersCount > 0 && (
              <Path path={wavyTopPath}>
                <LinearGradient
                  start={vec(0, TUBE_HEIGHT - layersCount * LAYER_HEIGHT)}
                  end={vec(0, TUBE_HEIGHT - topRunStart * LAYER_HEIGHT)}
                  colors={[lighten(topColor, 0.28), topColor]}
                />
              </Path>
            )}

            {layersCount > 0 && (
              <Group>
                <Circle
                  cx={TUBE_WIDTH * 0.62}
                  cy={bubbleA}
                  r={2.2}
                  color="rgba(255,255,255,0.4)"
                />
                <Circle
                  cx={TUBE_WIDTH * 0.4}
                  cy={bubbleB}
                  r={1.6}
                  color="rgba(255,255,255,0.32)"
                />
              </Group>
            )}

            {previewRole === 'source' && (
              <Rect
                x={4}
                y={sourceMaskY}
                width={TUBE_WIDTH - 8}
                height={sourceMaskHeight}
                color={theme.tubeBackground}
              />
            )}
            {previewRole === 'target' && (
              <Group>
                <Rect
                  x={5}
                  y={targetPreviewY}
                  width={TUBE_WIDTH - 10}
                  height={transferHeight}
                  color={previewColor}
                />
                <Rect
                  x={11}
                  y={targetPreviewY}
                  width={4}
                  height={transferHeight}
                  color="rgba(255,255,255,0.22)"
                />
              </Group>
            )}

            <RoundedRect
              x={11}
              y={12}
              width={5}
              height={TUBE_HEIGHT - 30}
              r={2.5}
              color="rgba(255,255,255,0.18)"
            />
          </Group>

          {hinted && (
            <Path
              path={outlinePath}
              style="stroke"
              strokeWidth={3.5}
              color={theme.accent}
              opacity={hintOpacity}
              strokeCap="round"
            >
              <BlurMask blur={6} style="normal" />
            </Path>
          )}

          {completed && (
            <Path
              path={outlinePath}
              style="stroke"
              strokeWidth={3}
              color={topColor}
              strokeCap="round"
            >
              <BlurMask blur={5} style="normal" />
            </Path>
          )}

          {completed && celebrating && (
            <Path
              path={outlinePath}
              style="stroke"
              strokeWidth={7}
              color={topColor}
              opacity={celebrationOpacity}
              strokeCap="round"
            >
              <BlurMask blur={11} style="normal" />
            </Path>
          )}

          <Path
            path={outlinePath}
            style="stroke"
            strokeWidth={2.5}
            color={theme.tubeOutline}
            strokeCap="round"
          />
          <Path
            path={outlinePath}
            style="stroke"
            strokeWidth={1}
            color="rgba(255,255,255,0.45)"
            strokeCap="round"
          />
        </Canvas>

        {Array.from({ length: hiddenCount }).map((_, i) => (
          <Text
            key={`q-${i}`}
            style={[
              styles.hiddenMark,
              { bottom: i * LAYER_HEIGHT + (LAYER_HEIGHT - 18) / 2 },
            ]}
          >
            ?
          </Text>
        ))}
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
  canvas: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT,
  },
  hiddenMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: 'bold',
    pointerEvents: 'none',
  },
});
