import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { Tube as TubeType } from '../core/types';
import {
  TUBE_WIDTH,
  TUBE_HEIGHT,
  LAYER_HEIGHT,
  TUBE_SELECTED_LIFT,
  TUBE_CONTAINER_TOP_GAP,
} from './tube/dimensions';

// 네이티브 Tube와 동일한 상수 재노출 (게임 화면 레이아웃/붓기 좌표 계산이 의존)
export { TUBE_SELECTED_LIFT, TUBE_CONTAINER_TOP_GAP } from './tube/dimensions';

const SELECTED_OFFSET = -TUBE_SELECTED_LIFT;

type TubeProps = {
  tube: TubeType;
  selected: boolean;
  hinted?: boolean;
  onPress: () => void;
  tiltAngle?: number;
  translationX?: number;
  translationY?: number;
};

export function TubeComponent({
  tube,
  selected,
  hinted = false,
  onPress,
  tiltAngle = 0,
  translationX = 0,
  translationY = 0,
}: TubeProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const defaultY = selected ? SELECTED_OFFSET : 0;
    return {
      transform: [
        {
          translateX: withSpring(translationX, {
            damping: 18,
            stiffness: 150,
          }),
        },
        {
          translateY: withSpring(defaultY + translationY, {
            damping: 18,
            stiffness: 150,
          }),
        },
        {
          rotate: `${withSpring(tiltAngle, {
            damping: 18,
            stiffness: 150,
          })}deg`,
        },
      ],
    };
  });

  // Reverse layers so top of stack is rendered first (on top) in flexDirection: 'column'
  const reversedLayers = [...tube.layers].reverse();

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          style={[
            styles.tubeBody,
            {
              borderColor: hinted ? theme.accent : theme.tubeOutline,
              backgroundColor: theme.tubeBackground || 'transparent',
            },
          ]}
        >
          {reversedLayers.map((colorId, index) => {
            const color = theme.colors[colorId % theme.colors.length];
            return (
              <View
                key={`${tube.id}-${index}`}
                style={[
                  styles.layer,
                  {
                    backgroundColor: color,
                    height: LAYER_HEIGHT,
                  },
                ]}
              />
            );
          })}
        </View>
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
  tubeBody: {
    width: TUBE_WIDTH - 8,
    height: TUBE_HEIGHT,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  layer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
});
