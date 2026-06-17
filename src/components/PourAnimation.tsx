import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

export const POUR_DURATION_MS = 700;
/** 스트림을 이루는 액체 방울 수 — 촘촘할수록 연속된 줄기처럼 보인다 */
const NUM_DROPLETS = 11;
/** 기준 방울 지름(px, scale 1 기준) */
const DROP_BASE_SIZE = 13;
/** 호의 솟구침 높이(px) */
const ARC_HEIGHT = -30;
/** 방울이 입구를 떠나는 간격(progress 단위) */
const DROP_STAGGER = 0.045;
/** 한 방울이 입구→대상까지 가는 데 쓰는 progress 구간 */
const DROP_TRAVEL = 0.5;
/** 머리 방울이 대상에 닿는 시점(이때 스플래시가 인다) */
const SPLASH_START = 0.5;
const SPLASH_END = 0.85;

export type PourAnimationProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  /** 보드 반응형 스케일 — 방울/스플래시 크기를 튜브에 맞춘다 */
  scale?: number;
  onComplete: () => void;
};

export function PourAnimation({
  fromX,
  fromY,
  toX,
  toY,
  color,
  scale = 1,
  onComplete,
}: PourAnimationProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: POUR_DURATION_MS, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, [progress, onComplete]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_DROPLETS }).map((_, i) => (
        <Droplet
          key={i}
          index={i}
          progress={progress}
          fromX={fromX}
          fromY={fromY}
          toX={toX}
          toY={toY}
          color={color}
          scale={scale}
        />
      ))}
      <Splash progress={progress} x={toX} y={toY} color={color} scale={scale} />
    </View>
  );
}

type DropletProps = {
  index: number;
  progress: Animated.SharedValue<number>;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  scale: number;
};

function Droplet({
  index,
  progress,
  fromX,
  fromY,
  toX,
  toY,
  color,
  scale,
}: DropletProps) {
  // 머리(index 0)는 굵고 꼬리로 갈수록 가늘어져 액체 줄기처럼 보인다
  const headFrac = 1 - index / NUM_DROPLETS;

  const dropletStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const delay = index * DROP_STAGGER;

    let t = (p - delay) / DROP_TRAVEL;
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    const x = fromX + (toX - fromX) * t;
    // 중력 가속: 낙하는 뒤로 갈수록 빨라진다(ease-in)
    const fall = t * t * 0.55 + t * 0.45;
    const y =
      fromY + (toY - fromY) * fall + ARC_HEIGHT * scale * Math.sin(t * Math.PI);

    const visible = t > 0 && t < 1;
    // 머리는 굵고 꼬리는 가늘게 + 낙하하며 살짝 가늘어짐
    const size =
      DROP_BASE_SIZE * scale * (0.6 + 0.4 * headFrac) * (1 - t * 0.25);

    return {
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size * 1.15,
      borderRadius: size,
      backgroundColor: color,
      opacity: visible ? 1 : 0,
    };
  });

  return <Animated.View style={dropletStyle} />;
}

type SplashProps = {
  progress: Animated.SharedValue<number>;
  x: number;
  y: number;
  color: string;
  scale: number;
};

/** 머리 방울이 대상 액체에 닿는 순간 퍼지는 잔물결 링 (착지의 시각적 '퐁') */
function Splash({ progress, x, y, color, scale }: SplashProps) {
  const splashStyle = useAnimatedStyle(() => {
    const p = progress.value;
    let s = (p - SPLASH_START) / (SPLASH_END - SPLASH_START);
    if (s < 0) s = 0;
    if (s > 1) s = 1;

    const visible = p > SPLASH_START && p < 1;
    const size = (10 + 26 * s) * scale;

    return {
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 2 * scale,
      borderColor: color,
      opacity: visible ? (1 - s) * 0.8 : 0,
    };
  });

  return <Animated.View style={splashStyle} />;
}
