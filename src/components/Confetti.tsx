import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { prand } from '../utils/prand';

const BURST_DURATION_MS = 2300;
const FADE_START = 0.76;

type Piece = {
  angle: number;
  speed: number;
  gravity: number;
  rotation: number;
  size: number;
  color: string;
  flutterFreq: number;
  flutterPhase: number;
  shape: 'rect' | 'circle';
};

type ConfettiProps = {
  colors: string[];
  originX: number;
  originY: number;
  seed?: number;
  intensity?: 1 | 2 | 3;
  delayMs?: number;
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
    const flutter = Math.cos(piece.flutterPhase + t * piece.flutterFreq);
    return [
      { translateX: x },
      { translateY: y },
      { rotate: piece.rotation * t },
      { scaleX: piece.shape === 'rect' ? flutter : 1 },
      { scale: 0.45 + Math.min(1, t * 8) * 0.55 },
    ];
  });

  const opacity = useDerivedValue(() => {
    const t = progress.value;
    if (t <= 0) return 0;
    return t < FADE_START
      ? 1
      : Math.max(0, 1 - (t - FADE_START) / (1 - FADE_START));
  });

  return (
    <Group transform={transform} origin={vec(0, 0)} opacity={opacity}>
      {piece.shape === 'circle' ? (
        <Circle cx={0} cy={0} r={piece.size * 0.38} color={piece.color} />
      ) : (
        <RoundedRect
          x={-piece.size / 2}
          y={-piece.size * 0.3}
          width={piece.size}
          height={piece.size * 0.6}
          r={1.5}
          color={piece.color}
        />
      )}
    </Group>
  );
}

/** 레벨·별점에 따라 궤적과 밀도가 달라지는 클리어 컨페티. */
export function Confetti({
  colors,
  originX,
  originY,
  seed = 0,
  intensity = 2,
  delayMs = 0,
}: ConfettiProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: BURST_DURATION_MS,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [progress, delayMs]);

  const pieceCount = 26 + intensity * 16;
  const pieces = useMemo<Piece[]>(
    () => {
      const palette = colors.length > 0 ? colors : ['#FFD44A', '#FFFFFF'];
      return Array.from({ length: pieceCount }, (_, index) => {
        const i = index + seed * 101;
        return {
          angle: -Math.PI / 2 + (prand(i, 1) - 0.5) * Math.PI * 1.76,
          speed: 150 + prand(i, 2) * (250 + intensity * 70),
          gravity: 300 + prand(i, 3) * 250,
          rotation: (prand(i, 4) * 6 - 3) * Math.PI,
          size: 7 + prand(i, 5) * (8 + intensity),
          color: palette[(index + seed) % palette.length],
          flutterFreq: 13 + prand(i, 6) * 18,
          flutterPhase: prand(i, 7) * Math.PI * 2,
          shape: index % 4 === 0 ? 'circle' : 'rect',
        };
      });
    },
    [pieceCount, seed, intensity, colors],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={index}
          progress={progress}
          piece={piece}
          originX={originX}
          originY={originY}
        />
      ))}
    </Canvas>
  );
}
