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
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { hiddenLayerCount } from '../core/rules';
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
/** 색이 가려진(미공개) 레이어 표시색 (회색) */
const HIDDEN_COLOR = '#9aa0aa';

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
  // 바닥부터 가려진(색 미공개) 레이어 수 — 회색+? 로 표시(클래식 고레벨). 맨 위는 항상 공개.
  const hiddenCount = hiddenLayerCount(tube);

  // 연속된 같은 색 레이어를 하나의 런(블록)으로 묶는다 — 같은 색끼리는 칸 경계 없이
  // 한 덩어리로 보이게 한다(사용자 요청). start=바닥부터의 시작 인덱스, count=레이어 수.
  // 가려진 칸은 색과 무관하게 하나의 회색 덩어리로 묶고, 공개 칸은 색끼리 묶는다.
  const runs = useMemo(() => {
    const out: {
      colorId: number;
      start: number;
      count: number;
      hidden: boolean;
    }[] = [];
    for (let i = 0; i < tube.layers.length; i++) {
      const hidden = i < hiddenCount;
      const c = tube.layers[i];
      const last = out[out.length - 1];
      if (last && last.hidden === hidden && (hidden || last.colorId === c)) {
        last.count += 1;
      } else {
        out.push({ colorId: c, start: i, count: 1, hidden });
      }
    }
    return out;
  }, [tube.layers, hiddenCount]);
  // 최상단 런은 출렁이는 메니스커스로 그리고, 그 아래 런들만 평평한 블록으로 그린다.
  const topRunStart = runs.length > 0 ? runs[runs.length - 1].start : 0;
  const underRuns = runs.slice(0, -1);

  // 출렁이는 최상단 '한 레이어'만 그리는 메니스커스.
  // 예전엔 바닥(TUBE_HEIGHT)까지 채워 액체 기둥 전체를 top 색으로 덮어버려,
  // 아래 레이어들이 가려져 꽉 찬 튜브가 한 색으로 통일돼 보이던 버그가 있었다.
  // 이제 최상단 '런'(연속 같은 색) 밴드만 채운다.
  const wavyTopPath = useDerivedValue(() => {
    const path = surfacePath;
    path.reset();
    if (layersCount === 0) return path;

    const y = TUBE_HEIGHT - layersCount * LAYER_HEIGHT;
    const bandBottom = TUBE_HEIGHT - topRunStart * LAYER_HEIGHT; // 최상단 런 밑면
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

            {/* 아래쪽 런들 — 같은 색은 한 블록으로 묶어 칸 경계 없이 그린다 */}
            {underRuns.map((run) => {
              const top = TUBE_HEIGHT - (run.start + run.count) * LAYER_HEIGHT;
              const h = run.count * LAYER_HEIGHT;
              const base = run.hidden
                ? HIDDEN_COLOR
                : theme.colors[run.colorId % theme.colors.length];
              return (
                <RoundedRect
                  key={`${tube.id}-r${run.start}`}
                  x={5}
                  y={top - 1}
                  width={TUBE_WIDTH - 10}
                  height={h + 2}
                  r={0}
                >
                  <LinearGradient
                    start={vec(0, top)}
                    end={vec(0, top + h)}
                    colors={[lighten(base, 0.22), base, darken(base, 0.06)]}
                  />
                </RoundedRect>
              );
            })}

            {/* 출렁이는 최상단 런 (연속 같은 색을 한 덩어리로) */}
            {layersCount > 0 && (
              <Path path={wavyTopPath}>
                <LinearGradient
                  start={vec(0, TUBE_HEIGHT - layersCount * LAYER_HEIGHT)}
                  end={vec(0, TUBE_HEIGHT - topRunStart * LAYER_HEIGHT)}
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

        {/* 가려진 레이어 위에 '?' 표식 — 색을 모른다는 신호 (캔버스 위 오버레이) */}
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
