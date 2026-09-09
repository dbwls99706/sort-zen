import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { makeGravityPath } from './streamPath';
import { getStreamProgress, getStreamWindow, POUR_STREAM_FILL_PHASE } from './pourTiming';
import { usePourTimeline } from './tube/usePourTimeline';

export type PourAnimationProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  layerCount: number;
  progress: SharedValue<number>;
  scale?: number;
  onStreamStart?: () => void;
  onImpact?: () => void;
  onComplete: () => void;
};
const BASE_STREAM_WIDTH = 5;
const SPLASH_RADIUS = 13;

export function PourAnimation(props: PourAnimationProps) {
  const { fromX, fromY, toX, toY, color, layerCount, progress, scale = 1 } = props;
  const timing = usePourTimeline(progress, layerCount, props);
  const width = (BASE_STREAM_WIDTH + Math.min(4, layerCount) * 0.7) * scale;
  const path = useMemo(() => makeGravityPath(fromX, fromY, toX, toY), [fromX, fromY, toX, toY]);
  const stream = useDerivedValue(() => getStreamProgress(progress.value, timing));
  const head = useDerivedValue(() => getStreamWindow(stream.value).head);
  const tail = useDerivedValue(() => getStreamWindow(stream.value).tail);
  const opacity = useDerivedValue(() => (stream.value > 0 && stream.value < 1 ? 1 : 0));
  const splash = useDerivedValue(() =>
    Math.max(
      0,
      Math.min(1, (stream.value - POUR_STREAM_FILL_PHASE) / (1 - POUR_STREAM_FILL_PHASE)),
    ),
  );
  const radius = useDerivedValue(() =>
    splash.value > 0 ? (3 + splash.value * SPLASH_RADIUS) * scale : 0,
  );
  const splashOpacity = useDerivedValue(() => (splash.value > 0 ? (1 - splash.value) * 0.65 : 0));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={path}
        start={tail}
        end={head}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        color={color}
        opacity={opacity}
      />
      <Path
        path={path}
        start={tail}
        end={head}
        style="stroke"
        strokeWidth={Math.max(1, width * 0.25)}
        strokeCap="round"
        color="rgba(255,255,255,0.55)"
        opacity={opacity}
      />
      <Circle
        cx={toX}
        cy={toY}
        r={radius}
        style="stroke"
        strokeWidth={1.5 * scale}
        color={color}
        opacity={splashOpacity}
      />
    </Canvas>
  );
}
