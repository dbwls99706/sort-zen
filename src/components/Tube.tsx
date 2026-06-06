import React, { useMemo } from 'react';
import { Canvas, RoundedRect, Path, Skia, Group } from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { DEFAULT_CAPACITY } from '../core/constants';

const TUBE_WIDTH = 52;
const TUBE_HEIGHT = 160;
const LAYER_HEIGHT = TUBE_HEIGHT / DEFAULT_CAPACITY;
const BORDER_RADIUS = 12;

// 선택 시 위로 떠오르는 높이, 컨테이너 상단 여백(떠오를 공간) — 붓기 연출 좌표 계산에 재사용
export const TUBE_SELECTED_LIFT = 20;
export const TUBE_CONTAINER_TOP_GAP = TUBE_SELECTED_LIFT + 4;
const SELECTED_OFFSET = -TUBE_SELECTED_LIFT;

type TubeProps = {
  tube: TubeType;
  selected: boolean;
  onPress: () => void;
};

export function TubeComponent({ tube, selected, onPress }: TubeProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(selected ? SELECTED_OFFSET : 0, {
          damping: 15,
          stiffness: 200,
        }),
      },
    ],
  }));

  // Create loop animation for fluid waves
  const wavePhase = useSharedValue(0);
  React.useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(2 * Math.PI, {
        duration: 2500,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [wavePhase]);

  // Closed interior clip path
  const clipPath = useMemo(() => {
    const path = Skia.Path.Make();
    const left = 6;
    const right = TUBE_WIDTH - 6;
    const bottom = TUBE_HEIGHT - 6;
    const top = 6;
    const r = BORDER_RADIUS - 3;

    path.moveTo(left, top);
    path.lineTo(left, bottom - r);
    path.quadTo(left, bottom, left + r, bottom);
    path.lineTo(right - r, bottom);
    path.quadTo(right, bottom, right, bottom - r);
    path.lineTo(right, top);
    path.close();
    return path;
  }, []);

  const outlinePath = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(4, 8);
    path.lineTo(4, TUBE_HEIGHT - BORDER_RADIUS);
    path.quadTo(4, TUBE_HEIGHT - 4, BORDER_RADIUS, TUBE_HEIGHT - 4);
    path.lineTo(TUBE_WIDTH - BORDER_RADIUS, TUBE_HEIGHT - 4);
    path.quadTo(
      TUBE_WIDTH - 4,
      TUBE_HEIGHT - 4,
      TUBE_WIDTH - 4,
      TUBE_HEIGHT - BORDER_RADIUS,
    );
    path.lineTo(TUBE_WIDTH - 4, 8);
    return path;
  }, []);

  const layersCount = tube.layers.length;
  const topIndex = layersCount - 1;
  const underLayers = useMemo(() => tube.layers.slice(0, topIndex), [tube.layers, topIndex]);

  // Derived wavy path for the topmost layer
  const wavyTopPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (layersCount === 0) return path;

    const y = TUBE_HEIGHT - layersCount * LAYER_HEIGHT;
    const left = 5;
    const right = TUBE_WIDTH - 5;
    const width = right - left;
    const steps = 12;
    const stepWidth = width / steps;
    const phase = wavePhase.value;
    const amplitude = 2.5; // subtle wave

    path.moveTo(left, TUBE_HEIGHT);
    path.lineTo(left, y + Math.sin(phase) * amplitude);

    for (let i = 1; i <= steps; i++) {
      const x = left + i * stepWidth;
      const t = i / steps;
      const waveY = y + Math.sin(phase + t * Math.PI * 2) * amplitude;
      path.lineTo(x, waveY);
    }

    path.lineTo(right, TUBE_HEIGHT);
    path.close();
    return path;
  });

  const topColorId = layersCount > 0 ? tube.layers[topIndex] : 0;
  const topColor = theme.colors[topColorId % theme.colors.length];

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={styles.canvas}>
          <Group clip={clipPath}>
            {/* Base Background */}
            <RoundedRect
              x={6}
              y={6}
              width={TUBE_WIDTH - 12}
              height={TUBE_HEIGHT - 12}
              r={0}
              color={theme.tubeBackground || 'transparent'}
            />

            {/* Flat Under Layers */}
            {underLayers.map((colorId, index) => {
              const y = TUBE_HEIGHT - (index + 1) * LAYER_HEIGHT;
              const color = theme.colors[colorId % theme.colors.length];
              return (
                <RoundedRect
                  key={`${tube.id}-${index}`}
                  x={5}
                  y={y - 1} // tiny overlap to prevent gap
                  width={TUBE_WIDTH - 10}
                  height={LAYER_HEIGHT + 2}
                  r={0}
                  color={color}
                />
              );
            })}

            {/* Wavy Topmost Layer */}
            {layersCount > 0 && (
              <Path path={wavyTopPath} color={topColor} />
            )}
          </Group>

          {/* Tube Outer Glass Outline */}
          <Path
            path={outlinePath}
            style="stroke"
            strokeWidth={2.5}
            color={theme.tubeOutline}
            strokeCap="round"
          />
        </Canvas>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  canvas: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT,
  },
});
