import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Fill,
  Circle,
  Group,
  LinearGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { lighten, darken } from '../utils/color';
import { prand } from '../utils/prand';

const BOKEH_COUNT = 6;
const DRIFT = 16;

function Bokeh({
  clock,
  index,
  color,
  width,
  height,
}: {
  clock: SharedValue<number>;
  index: number;
  color: string;
  width: number;
  height: number;
}) {
  const baseX = prand(index, 1) * width;
  const baseY = prand(index, 2) * height;
  const radius = 50 + prand(index, 3) * 80;
  const phase = prand(index, 4) * Math.PI * 2;

  const cy = useDerivedValue(
    () => baseY + Math.sin(clock.value + phase) * DRIFT,
  );

  return (
    <Group opacity={0.1}>
      <Circle cx={baseX} cy={cy} r={radius} color={color}>
        <BlurMask blur={32} style="normal" />
      </Circle>
    </Group>
  );
}

/**
 * 화면 뒤에 깔리는 은은한 그라데이션 + 보케 (힐링 톤).
 * animated=false면 보케 드리프트를 멈춰 블러 레이어 상시 재페인트를 없앤다
 * (붓기가 부드러워야 하는 게임 화면에서 GPU 비용 절감).
 */
export function Background({ animated = true }: { animated?: boolean }) {
  const theme = useTheme();
  // 모듈 스코프 Dimensions는 창 크기 변화(대화면 회전·폴더블·분할 화면)를 못 따라간다.
  // targetSdk 36부터 600dp+ 화면에선 세로 고정이 무시되므로 훅으로 현재 크기를 읽는다.
  const { width: W, height: H } = useWindowDimensions();
  const clock = useSharedValue(0);

  React.useEffect(() => {
    if (!animated) return;
    clock.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock, animated]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, H)}
          colors={[
            lighten(theme.background, 0.03),
            theme.background,
            darken(theme.background, 0.05),
          ]}
        />
      </Fill>
      {Array.from({ length: BOKEH_COUNT }, (_, i) => (
        <Bokeh
          key={i}
          clock={clock}
          index={i}
          color={theme.colors[(i * 2) % theme.colors.length]}
          width={W}
          height={H}
        />
      ))}
    </Canvas>
  );
}
