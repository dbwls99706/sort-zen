import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { prand } from '../utils/prand';

// 웹 전용: Skia Group/RoundedRect 대신 Reanimated Animated.View로 동일한
// 발사각/속도/중력/페이드 물리를 재현한다(웹에서도 reanimated 워클릿 동작).
const BURST_DURATION_MS = 1500;
const PIECE_COUNT = 22;
const FADE_START = 0.7;

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
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const x = originX + Math.cos(piece.angle) * piece.speed * t;
    const y =
      originY + Math.sin(piece.angle) * piece.speed * t + piece.gravity * t * t;
    const opacity =
      t < FADE_START ? 1 : Math.max(0, 1 - (t - FADE_START) / (1 - FADE_START));
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.rot * t}rad` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.size, height: piece.size * 0.6, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

/** 클리어 순간 카드 위로 터지는 색종이 파티클 (웹) */
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
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPiece
          key={i}
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
    borderRadius: 1,
  },
});
