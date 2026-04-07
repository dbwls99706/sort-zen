import React from 'react';
import { Canvas, RoundedRect, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import { DEFAULT_CAPACITY } from '../core/constants';

const TUBE_WIDTH = 52;
const TUBE_HEIGHT = 160;
const LAYER_HEIGHT = TUBE_HEIGHT / DEFAULT_CAPACITY;
const BORDER_RADIUS = 12;
const SELECTED_OFFSET = -20;

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

  const outlinePath = Skia.Path.Make();
  outlinePath.moveTo(4, 8);
  outlinePath.lineTo(4, TUBE_HEIGHT - BORDER_RADIUS);
  outlinePath.quadTo(4, TUBE_HEIGHT - 4, BORDER_RADIUS, TUBE_HEIGHT - 4);
  outlinePath.lineTo(TUBE_WIDTH - BORDER_RADIUS, TUBE_HEIGHT - 4);
  outlinePath.quadTo(
    TUBE_WIDTH - 4,
    TUBE_HEIGHT - 4,
    TUBE_WIDTH - 4,
    TUBE_HEIGHT - BORDER_RADIUS,
  );
  outlinePath.lineTo(TUBE_WIDTH - 4, 8);

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Canvas style={styles.canvas}>
          {tube.layers.map((colorId, index) => {
            const y = TUBE_HEIGHT - (index + 1) * LAYER_HEIGHT;
            const isBottom = index === 0;
            const color = theme.colors[colorId % theme.colors.length];
            const radius = isBottom ? BORDER_RADIUS - 4 : 0;

            return (
              <RoundedRect
                key={`${tube.id}-${index}`}
                x={6}
                y={y}
                width={TUBE_WIDTH - 12}
                height={LAYER_HEIGHT - 1}
                r={radius}
                color={color}
              />
            );
          })}
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
    height: TUBE_HEIGHT + 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  canvas: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT,
  },
});
