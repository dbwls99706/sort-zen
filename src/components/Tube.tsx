import React, { useMemo } from 'react';
import {
  Canvas,
  RoundedRect,
  Path,
  Circle,
  Group,
  LinearGradient,
  BlurMask,
  vec,
  Skia,
} from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { lighten, darken } from '../utils/color';
import {
  TUBE_WIDTH,
  TUBE_HEIGHT,
  LAYER_HEIGHT,
  TUBE_SELECTED_LIFT,
  TUBE_CONTAINER_TOP_GAP,
  makeClipPath,
  makeOutlinePath,
} from './tube/geometry';

export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/geometry';

const WAVE_AMPLITUDE = 2.5;
const WAVE_STEPS = 12;
const SELECTED_OFFSET = -TUBE_SELECTED_LIFT;

type TubeProps = {
  tube: TubeType;
  selected: boolean;
  completed: boolean;
  onPress: () => void;
  tiltAngle?: number;
  translationX?: number;
  translationY?: number;
};

export function TubeComponent({
  tube,
  selected,
  completed,
  onPress,
  tiltAngle = 0,
  translationX = 0,
  translationY = 0,
}: TubeProps) {
  const theme = useTheme();

  // 완성 순간 통통 튀는 팝
  const pop = useSharedValue(1);
  const wasCompleted = React.useRef(false);
  React.useEffect(() => {
    if (completed && !wasCompleted.current) {
      pop.value = withSequence(
        withTiming(1.08, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 220 }),
      );
    }
    wasCompleted.current = completed;
  }, [completed, pop]);

  const animatedStyle = useAnimatedStyle(() => {
    const defaultY = selected ? SELECTED_OFFSET : 0;
    return {
      transform: [
        {
          translateX: withSpring(translationX, {
            damping: 18,
            stiffness: 150,
          }),
        },
        {
          translateY: withSpring(defaultY + translationY, {
            damping: 18,
            stiffness: 150,
          }),
        },
        {
          rotate: `${withSpring(tiltAngle, {
            damping: 18,
            stiffness: 150,
          })}deg`,
        },
        { scale: pop.value },
      ],
    };
  });

  const wavePhase = useSharedValue(0);
  React.useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2500, easing: Easing.linear }),
      -1,
      false,
    );
  }, [wavePhase]);

  const clipPath = useMemo(() => makeClipPath(), []);
  const outlinePath = useMemo(() => makeOutlinePath(), []);

  const layersCount = tube.layers.length;
  const topIndex = layersCount - 1;
  const underLayers = useMemo(
    () => tube.layers.slice(0, topIndex),
    [tube.layers, topIndex],
  );

  // 출렁이는 최상단 액체 표면(메니스커스)
  const wavyTopPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (layersCount === 0) return path;

    const y = TUBE_HEIGHT - layersCount * LAYER_HEIGHT;
    const left = 5;
    const right = TUBE_WIDTH - 5;
    const stepWidth = (right - left) / WAVE_STEPS;
    const phase = wavePhase.value;

    path.moveTo(left, TUBE_HEIGHT);
    path.lineTo(left, y + Math.sin(phase) * WAVE_AMPLITUDE);
    for (let i = 1; i <= WAVE_STEPS; i++) {
      const x = left + i * stepWidth;
      const t = i / WAVE_STEPS;
      path.lineTo(x, y + Math.sin(phase + t * Math.PI * 2) * WAVE_AMPLITUDE);
    }
    path.lineTo(right, TUBE_HEIGHT);
    path.close();
    return path;
  });

  const topColor =
    layersCount > 0
      ? theme.colors[tube.layers[topIndex] % theme.colors.length]
      : theme.tubeBackground;

  // 액체 안에서 천천히 떠오르는 기포 2개
  const liquidTop = TUBE_HEIGHT - layersCount * LAYER_HEIGHT + 4;
  const liquidBottom = TUBE_HEIGHT - 8;
  const bubbleA = useDerivedValue(() => {
    const p = (wavePhase.value / (2 * Math.PI) + 0.0) % 1;
    return liquidBottom - p * (liquidBottom - liquidTop);
  });
  const bubbleB = useDerivedValue(() => {
    const p = (wavePhase.value / (2 * Math.PI) + 0.5) % 1;
    return liquidBottom - p * (liquidBottom - liquidTop);
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={styles.canvas}>
          <Group clip={clipPath}>
            {/* 배경 */}
            <RoundedRect
              x={6}
              y={6}
              width={TUBE_WIDTH - 12}
              height={TUBE_HEIGHT - 12}
              r={0}
              color={theme.tubeBackground}
            />

            {/* 아래쪽 평평한 레이어들 (세로 그라데이션) */}
            {underLayers.map((colorId, index) => {
              const y = TUBE_HEIGHT - (index + 1) * LAYER_HEIGHT;
              const base = theme.colors[colorId % theme.colors.length];
              return (
                <RoundedRect
                  key={`${tube.id}-${index}`}
                  x={5}
                  y={y - 1}
                  width={TUBE_WIDTH - 10}
                  height={LAYER_HEIGHT + 2}
                  r={0}
                >
                  <LinearGradient
                    start={vec(0, y)}
                    end={vec(0, y + LAYER_HEIGHT)}
                    colors={[lighten(base, 0.22), base, darken(base, 0.06)]}
                  />
                </RoundedRect>
              );
            })}

            {/* 출렁이는 최상단 레이어 */}
            {layersCount > 0 && (
              <Path path={wavyTopPath}>
                <LinearGradient
                  start={vec(0, TUBE_HEIGHT - layersCount * LAYER_HEIGHT)}
                  end={vec(0, TUBE_HEIGHT)}
                  colors={[lighten(topColor, 0.28), topColor]}
                />
              </Path>
            )}

            {/* 기포 */}
            {layersCount > 0 && (
              <Group>
                <Circle cx={TUBE_WIDTH * 0.62} cy={bubbleA} r={2.2} color="rgba(255,255,255,0.4)" />
                <Circle cx={TUBE_WIDTH * 0.4} cy={bubbleB} r={1.6} color="rgba(255,255,255,0.32)" />
              </Group>
            )}

            {/* 유리 광택 하이라이트 */}
            <RoundedRect
              x={11}
              y={12}
              width={5}
              height={TUBE_HEIGHT - 30}
              r={2.5}
              color="rgba(255,255,255,0.18)"
            />
          </Group>

          {/* 완성 글로우 (단색으로 가득 찬 튜브) */}
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

          {/* 유리관 외곽선 + 림라이트 */}
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
});
