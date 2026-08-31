import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
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
  round: boolean;
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
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const x = originX + Math.cos(piece.angle) * piece.speed * t;
    const y =
      originY + Math.sin(piece.angle) * piece.speed * t + piece.gravity * t * t;
    const opacity =
      t <= 0
        ? 0
        : t < FADE_START
          ? 1
          : Math.max(0, 1 - (t - FADE_START) / (1 - FADE_START));
    const flutter = Math.cos(piece.flutterPhase + t * piece.flutterFreq);
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.rotation * t}rad` },
        { scaleX: piece.round ? 1 : flutter },
        { scale: 0.45 + Math.min(1, t * 8) * 0.55 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 0.6,
          borderRadius: piece.round ? piece.size / 2 : 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

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
          round: index % 4 === 0,
        };
      });
    },
    [pieceCount, seed, intensity, colors],
  );

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={index}
          progress={progress}
          piece={piece}
          originX={originX}
          originY={originY}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
