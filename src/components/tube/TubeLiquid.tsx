import React, { useMemo } from 'react';
import {
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import type { Tube as TubeType } from '../../core/types';
import { hiddenLayerCount } from '../../core/rules';
import { darken, lighten } from '../../utils/color';
import { useTheme } from '../ThemeProvider';
import { getTransferProgress } from '../pourTiming';
import { LAYER_HEIGHT, makeClipPath, TUBE_HEIGHT, TUBE_WIDTH } from './geometry';
import type { TubePourPreview } from './types';

const HIDDEN_COLOR = '#7E899C';
const SURFACE_WAVE_STEPS = 8;
const RIPPLE_AMPLITUDE = 3;

type Props = { tube: TubeType; ripple: SharedValue<number>; pourPreview?: TubePourPreview };

export function TubeLiquid({ tube, ripple, pourPreview }: Props) {
  const theme = useTheme();
  const clipPath = useMemo(() => makeClipPath(), []);
  const hiddenCount = hiddenLayerCount(tube);
  const runs = useMemo(() => {
    const result: { color: string; start: number; count: number }[] = [];
    tube.layers.forEach((colorId, index) => {
      const color =
        index < hiddenCount ? HIDDEN_COLOR : theme.colors[colorId % theme.colors.length];
      const last = result[result.length - 1];
      if (last?.color === color) last.count += 1;
      else result.push({ color, start: index, count: 1 });
    });
    return result;
  }, [tube.layers, hiddenCount, theme.colors]);
  const top = runs[runs.length - 1];
  const count = tube.layers.length;
  const progress = pourPreview?.progress;
  const start = pourPreview?.streamStartRatio ?? 0;
  const end = pourPreview?.streamEndRatio ?? 1;
  const role = pourPreview?.role;
  const transferCount = pourPreview?.count ?? 0;
  const height = useDerivedValue(() => {
    if (!progress || !role) return 0;
    const stream = (progress.value - start) / Math.max(0.0001, end - start);
    return getTransferProgress(stream, role) * transferCount * LAYER_HEIGHT;
  });
  const targetY = useDerivedValue(() => TUBE_HEIGHT - count * LAYER_HEIGHT - height.value);
  const topPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!top) return path;
    const removed = role === 'source' ? height.value : 0;
    const y = TUBE_HEIGHT - count * LAYER_HEIGHT + removed;
    const bottom = TUBE_HEIGHT - top.start * LAYER_HEIGHT;
    if (y >= bottom) return path;
    const amplitude = progress ? 0 : Math.sin(ripple.value * Math.PI) * RIPPLE_AMPLITUDE;
    path.moveTo(5, bottom);
    for (let step = 0; step <= SURFACE_WAVE_STEPS; step += 1) {
      const t = step / SURFACE_WAVE_STEPS;
      path.lineTo(
        5 + (TUBE_WIDTH - 10) * t,
        y + Math.sin(t * Math.PI * 2 + ripple.value * Math.PI * 4) * amplitude,
      );
    }
    path.lineTo(TUBE_WIDTH - 5, bottom);
    path.close();
    return path;
  });

  return (
    <Group clip={clipPath}>
      <Rect
        x={5}
        y={5}
        width={TUBE_WIDTH - 10}
        height={TUBE_HEIGHT - 10}
        color={theme.tubeBackground}
      />
      {runs.slice(0, -1).map((run) => {
        const y = TUBE_HEIGHT - (run.start + run.count) * LAYER_HEIGHT;
        return (
          <Rect
            key={run.start}
            x={5}
            y={y - 0.5}
            width={TUBE_WIDTH - 10}
            height={run.count * LAYER_HEIGHT + 1}
          >
            <LinearGradient
              start={vec(5, y)}
              end={vec(TUBE_WIDTH - 5, y)}
              colors={[lighten(run.color, 0.16), run.color, darken(run.color, 0.08)]}
            />
          </Rect>
        );
      })}
      {top && (
        <Path path={topPath}>
          <LinearGradient
            start={vec(5, 0)}
            end={vec(TUBE_WIDTH - 5, 0)}
            colors={[lighten(top.color, 0.16), top.color, darken(top.color, 0.08)]}
          />
        </Path>
      )}
      {role === 'target' && (
        <Rect x={5} y={targetY} width={TUBE_WIDTH - 10} height={height}>
          <LinearGradient
            start={vec(5, 0)}
            end={vec(TUBE_WIDTH - 5, 0)}
            colors={[
              lighten(pourPreview?.color ?? theme.accent, 0.16),
              pourPreview?.color ?? theme.accent,
            ]}
          />
        </Rect>
      )}
      <RoundedRect
        x={10}
        y={14}
        width={4}
        height={TUBE_HEIGHT - 30}
        r={2}
        color="rgba(255,255,255,0.25)"
      />
      <RoundedRect
        x={TUBE_WIDTH - 12}
        y={20}
        width={1.5}
        height={TUBE_HEIGHT - 48}
        r={0.75}
        color="rgba(255,255,255,0.12)"
      />
    </Group>
  );
}
