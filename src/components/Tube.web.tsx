import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
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
/** 튜브 선택/기울기 이동에 쓰는 공통 스프링 설정 */
const TILT_SPRING = { damping: 18, stiffness: 150 };

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

  // withSpring을 템플릿 리터럴에 직접 넣으면 애니메이션 객체가 문자열화되므로
  // 보간값을 먼저 숫자로 구한 뒤 worklet에서 단위를 붙인다.
  const tilt = useDerivedValue(() => withSpring(tiltAngle, TILT_SPRING));

  const animatedStyle = useAnimatedStyle(() => {
    const defaultY = selected ? SELECTED_OFFSET : 0;
    return {
      transform: [
        { translateX: withSpring(translationX, TILT_SPRING) },
        { translateY: withSpring(defaultY + translationY, TILT_SPRING) },
        { rotate: `${tilt.value}deg` },
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
