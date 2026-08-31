import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { type AsmrMaterial } from '../../audio/asmrPools';
import { prand } from '../../utils/prand';

type MaterialEffectsProps = {
  material: AsmrMaterial;
  size: number;
  primary: string;
  secondary: string;
};

type Dot = { x: number; y: number; size: number; opacity: number };

function WaterRing({
  clock,
  size,
  delay,
}: {
  clock: SharedValue<number>;
  size: number;
  delay: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = (clock.value + delay) % 1;
    return {
      opacity: Math.max(0, 0.48 - t * 0.48),
      transform: [{ scale: 0.35 + t * 1.2 }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.waterRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        style,
      ]}
    />
  );
}

function FloatingDot({
  dot,
  clock,
  index,
}: {
  dot: Dot;
  clock: SharedValue<number>;
  index: number;
}) {
  const style = useAnimatedStyle(() => {
    const phase = clock.value * Math.PI * 2 + index * 0.9;
    return {
      opacity: dot.opacity,
      transform: [
        { translateY: Math.sin(phase) * 5 },
        { translateX: Math.cos(phase * 0.7) * 3 },
        { scale: 0.9 + Math.sin(phase + 1) * 0.1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: dot.x,
          top: dot.y,
          width: dot.size,
          height: dot.size,
          borderRadius: dot.size / 2,
          opacity: dot.opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * 동일한 소프트바디 위에 재질별 표면 단서를 더한다.
 * 물=파문, 슬라임=내부 기포, 폼=미세 거품, 스펀지=기공, 로션=광택 결로 구분한다.
 */
export function MaterialEffects({
  material,
  size,
  primary,
  secondary,
}: MaterialEffectsProps) {
  const clock = useSharedValue(0);
  React.useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock]);

  const dots = useMemo<Dot[]>(
    () =>
      Array.from(
        { length: material === 'sponge' ? 18 : 12 },
        (_, i) => {
          const angle = prand(i, material.length + 1) * Math.PI * 2;
          const radius =
            Math.sqrt(prand(i, material.length + 2)) * size * 0.29;
          const dotSize =
            material === 'shaving'
              ? 9 + prand(i, 7) * 16
              : material === 'sponge'
                ? 7 + prand(i, 8) * 12
                : 5 + prand(i, 9) * 9;
          return {
            x: size / 2 + Math.cos(angle) * radius - dotSize / 2,
            y: size / 2 + Math.sin(angle) * radius - dotSize / 2,
            size: dotSize,
            opacity: 0.16 + prand(i, 10) * 0.26,
          };
        },
      ),
    [material, size],
  );

  const glossStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(clock.value * Math.PI * 2) * 12 },
      { rotate: '-18deg' },
    ],
    opacity: 0.2 + Math.sin(clock.value * Math.PI * 2) * 0.05,
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: material === 'sponge' ? size * 0.22 : size / 2,
        },
      ]}
    >
      {material === 'water' && (
        <View style={styles.centered}>
          <WaterRing clock={clock} size={size * 0.46} delay={0} />
          <WaterRing clock={clock} size={size * 0.38} delay={0.34} />
          <WaterRing clock={clock} size={size * 0.3} delay={0.67} />
        </View>
      )}

      {(material === 'slime' || material === 'shaving') &&
        dots.map((dot, index) => (
          <FloatingDot key={index} dot={dot} clock={clock} index={index} />
        ))}

      {material === 'sponge' &&
        dots.map((dot, index) => (
          <View
            key={index}
            style={[
              styles.pore,
              {
                left: dot.x,
                top: dot.y,
                width: dot.size,
                height: dot.size * 0.72,
                borderRadius: dot.size / 2,
                opacity: dot.opacity + 0.08,
                backgroundColor:
                  index % 2 === 0 ? `${primary}38` : `${secondary}52`,
              },
            ]}
          />
        ))}

      {material === 'handcream' && (
        <>
          <Animated.View
            style={[
              styles.gloss,
              {
                width: size * 0.15,
                height: size * 0.58,
                left: size * 0.36,
                top: size * 0.2,
              },
              glossStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.gloss,
              {
                width: size * 0.06,
                height: size * 0.42,
                left: size * 0.56,
                top: size * 0.3,
                opacity: 0.13,
              },
              glossStyle,
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 2,
    overflow: 'hidden',
  },
  centered: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  waterRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  dot: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pore: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(120,95,20,0.16)',
  },
  gloss: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});
