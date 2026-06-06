import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
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

const { width: W, height: H } = Dimensions.get('window');
const BOKEH_COUNT = 6;
const DRIFT = 16;

function Bokeh({
  clock,
  index,
  color,
}: {
  clock: SharedValue<number>;
  index: number;
  color: string;
}) {
  const baseX = prand(index, 1) * W;
  const baseY = prand(index, 2) * H;
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

/** 화면 뒤에 깔리는 은은한 그라데이션 + 천천히 떠다니는 보케 (힐링 톤) */
export function Background() {
  const theme = useTheme();
  const clock = useSharedValue(0);

  React.useEffect(() => {
    clock.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock]);

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
        />
      ))}
    </Canvas>
  );
}
