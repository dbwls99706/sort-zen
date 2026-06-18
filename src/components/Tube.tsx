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
  cancelAnimation,
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

const WAVE_AMPLITUDE = 3;
const WAVE_STEPS = 12;
/** 액체가 들어오고 나갈 때 표면이 크게 출렁이는 서지 진폭(기본 파동에 가산) */
const WAVE_SURGE_AMPLITUDE = 5;
/** 서지가 잦아드는 시간 */
const WAVE_SURGE_DECAY_MS = 900;
const SELECTED_OFFSET = -TUBE_SELECTED_LIFT;
/** 튜브 선택/기울기 이동에 쓰는 공통 스프링 설정 */
const TILT_SPRING = { damping: 18, stiffness: 150 };

type TubeProps = {
  tube: TubeType;
  selected: boolean;
  completed: boolean;
  hinted?: boolean;
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

  // rotate는 단위를 붙인 문자열이어야 하므로, 스프링 보간값을 먼저
  // 숫자로 구한 뒤 worklet에서 문자열로 합친다. withSpring을 템플릿
  // 리터럴에 직접 넣으면 애니메이션 객체가 "[object Object]"로 문자열화되어
  // 네이티브 transform 파서가 크래시한다.
  const tilt = useDerivedValue(() => withSpring(tiltAngle, TILT_SPRING));

  const animatedStyle = useAnimatedStyle(() => {
    const defaultY = selected ? SELECTED_OFFSET : 0;
    return {
      transform: [
        { translateX: withSpring(translationX, TILT_SPRING) },
        { translateY: withSpring(defaultY + translationY, TILT_SPRING) },
        { rotate: `${tilt.value}deg` },
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

  // 액체량이 바뀐 직후(붓기/받기) 표면이 크게 출렁였다가 잦아든다
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

  // 힌트 하이라이트 — 외곽선이 부드럽게 맥동
  const hintPulse = useSharedValue(0);
  React.useEffect(() => {
    if (hinted) {
      hintPulse.value = withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(hintPulse);
      hintPulse.value = 0;
    }
  }, [hinted, hintPulse]);
  const hintOpacity = useDerivedValue(
    () => 0.45 + hintPulse.value * 0.55,
  );

  const clipPath = useMemo(() => makeClipPath(), []);
  const outlinePath = useMemo(() => makeOutlinePath(), []);
  // 표면 파동은 매 프레임 갱신되므로 패스를 새로 할당하지 않고 하나를 재사용한다.
  // (튜브 개수 × 60fps 만큼의 SkPath 할당/GC를 제거 — H2)
  const surfacePath = useMemo(() => Skia.Path.Make(), []);

  const layersCount = tube.layers.length;
  const topIndex = layersCount - 1;
  const underLayers = useMemo(
    () => tube.layers.slice(0, topIndex),
    [tube.layers, topIndex],
  );

  // 출렁이는 최상단 '한 레이어'만 그리는 메니스커스.
  // 예전엔 바닥(TUBE_HEIGHT)까지 채워 액체 기둥 전체를 top 색으로 덮어버려,
  // 아래 레이어들이 가려져 꽉 찬 튜브가 한 색으로 통일돼 보이던 버그가 있었다.
  // 이제 top 레이어 밴드([y, y+LAYER_HEIGHT])만 채운다.
  const wavyTopPath = useDerivedValue(() => {
    const path = surfacePath;
    path.reset();
    if (layersCount === 0) return path;

    const y = TUBE_HEIGHT - layersCount * LAYER_HEIGHT;
    const bandBottom = y + LAYER_HEIGHT; // top 레이어 밑면(다음 레이어와의 경계)
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
                  end={vec(0, TUBE_HEIGHT - (layersCount - 1) * LAYER_HEIGHT)}
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

          {/* 힌트 글로우 (다음 수 하이라이트) */}
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
