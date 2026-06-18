import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, RoundedRect, vec } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { prand } from '../utils/prand';

const BURST_DURATION_MS = 2300;
const PIECE_COUNT = 50;
const FADE_START = 0.78;

type Piece = {
  angle: number;
  speed: number;
  gravity: number;
  rot: number;
  size: number;
  color: string;
  flutterFreq: number;
  flutterPhase: number;
};

type ConfettiProps = {
  colors: string[];
  originX: number;
  originY: number;
};

function ConfettiPiece({
  progress,
  piece,
  originX,
  originY,
}: {
  progress: SharedValue<number>;
  piece: Piece;
  originX: number;
  originY: number;
}) {
  const transform = useDerivedValue(() => {
    const t = progress.value;
    const x = originX + Math.cos(piece.angle) * piece.speed * t;
    const y =
      originY + Math.sin(piece.angle) * piece.speed * t + piece.gravity * t * t;
    // 종이가 펄럭이며 뒤집히는 느낌 — scaleX를 진동시켜 입체감을 준다.
    const flutter = Math.cos(piece.flutterPhase + t * piece.flutterFreq);
    return [
      { translateX: x },
      { translateY: y },
      { rotate: piece.rot * t },
      { scaleX: flutter },
    ];
  });

  const opacity = useDerivedValue(() => {
    const t = progress.value;
    return t < FADE_START ? 1 : Math.max(0, 1 - (t - FADE_START) / (1 - FADE_START));
  });

  return (
    <Group transform={transform} origin={vec(0, 0)} opacity={opacity}>
      <RoundedRect
        x={-piece.size / 2}
        y={-piece.size / 2}
        width={piece.size}
        height={piece.size * 0.6}
        r={1}
        color={piece.color}
      />
    </Group>
  );
}

/** 클리어 순간 카드 위로 터지는 색종이 파티클 */
export function Confetti({ colors, originX, originY }: ConfettiProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, {
      duration: BURST_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        // 위쪽으로 넓게(거의 반원) 분사해 카드 주변·머리 위까지 색종이가 흩날린다.
        angle: -Math.PI / 2 + (prand(i, 1) - 0.5) * Math.PI * 1.7,
        speed: 160 + prand(i, 2) * 320,
        gravity: 320 + prand(i, 3) * 220,
        rot: (prand(i, 4) * 6 - 3) * Math.PI,
        size: 8 + prand(i, 5) * 8,
        color: colors[i % colors.length],
        flutterFreq: 14 + prand(i, 6) * 16,
        flutterPhase: prand(i, 7) * Math.PI * 2,
      })),
    [colors],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPiece
          key={i}
          progress={progress}
          piece={piece}
          originX={originX}
          originY={originY}
        />
      ))}
    </Canvas>
  );
}
