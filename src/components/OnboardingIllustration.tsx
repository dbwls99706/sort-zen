import React, { useMemo } from 'react';
import {
  Canvas,
  Group,
  RoundedRect,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';

const W = 218;
const H = 150;
const TUBE_W = 34;
const TUBE_H = 92;
const BASE_Y = 124;
const SEG_H = 22;
const TUBE_X = [26, 92, 158];
const FILL_PHASE = 0.5;

// 데코용 미니 보드 (각 튜브의 색 인덱스 구성)
const LAYOUT: number[][] = [
  [0, 1, 1],
  [2, 0],
  [1, 2, 0],
];

/** 온보딩용: 한 튜브에서 다른 튜브로 액체가 반복해서 흐르는 미니 일러스트 */
export function OnboardingIllustration() {
  const theme = useTheme();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [progress]);

  const fromX = TUBE_X[0] + TUBE_W / 2;
  const fromY = BASE_Y - LAYOUT[0].length * SEG_H;
  const toX = TUBE_X[1] + TUBE_W / 2;
  const toY = BASE_Y - LAYOUT[1].length * SEG_H;

  const basePath = useMemo(() => {
    const peakY = Math.min(fromY, toY) - 34;
    const p = Skia.Path.Make();
    p.moveTo(fromX, fromY);
    p.cubicTo(fromX, peakY, toX, peakY, toX, toY);
    return p;
  }, [fromX, fromY, toX, toY]);

  const streamPath = useDerivedValue(() => {
    const t = progress.value;
    const head = t < FILL_PHASE ? t / FILL_PHASE : 1;
    const tail = t < FILL_PHASE ? 0 : (t - FILL_PHASE) / (1 - FILL_PHASE);
    const copy = basePath.copy();
    copy.trim(tail, head, false);
    return copy;
  });

  return (
    <Canvas style={{ width: W, height: H, marginBottom: 28 }}>
      {TUBE_X.map((x, ti) => (
        <Group key={ti}>
          {LAYOUT[ti].map((colorId, si) => (
            <RoundedRect
              key={si}
              x={x + 3}
              y={BASE_Y - (si + 1) * SEG_H}
              width={TUBE_W - 6}
              height={SEG_H}
              r={0}
              color={theme.colors[colorId % theme.colors.length]}
            />
          ))}
          <RoundedRect
            x={x}
            y={BASE_Y - TUBE_H}
            width={TUBE_W}
            height={TUBE_H}
            r={10}
            style="stroke"
            strokeWidth={2.5}
            color={theme.tubeOutline}
          />
        </Group>
      ))}

      <Path
        path={streamPath}
        style="stroke"
        strokeWidth={7}
        strokeCap="round"
        strokeJoin="round"
        color={theme.colors[LAYOUT[0][LAYOUT[0].length - 1] % theme.colors.length]}
        opacity={0.92}
      />
    </Canvas>
  );
}
