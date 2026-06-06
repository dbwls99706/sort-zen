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

const BURST_DURATION_MS = 1500;
const PIECE_COUNT = 22;
const FADE_START = 0.7;

/** 인덱스 기반 결정적 의사난수 (렌더 순수성 보장, 0~1) */
function prand(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Piece = {
  angle: number;
  speed: number;
  gravity: number;
  rot: number;
  size: number;
  color: string;
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
    return [{ translateX: x }, { translateY: y }, { rotate: piece.rot * t }];
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
        angle: -Math.PI / 2 + (prand(i, 1) - 0.5) * Math.PI * 1.2,
        speed: 120 + prand(i, 2) * 170,
        gravity: 220 + prand(i, 3) * 140,
        rot: (prand(i, 4) * 4 - 2) * Math.PI,
        size: 7 + prand(i, 5) * 6,
        color: colors[i % colors.length],
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
