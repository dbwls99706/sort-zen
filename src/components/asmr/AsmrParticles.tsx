import React, { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type ParticleShape = 'circle' | 'cloud' | 'square' | 'droplet';
export type ParticlePalette = {
  colors: string[];
  speed: number;
  gravity: number;
  shape: ParticleShape;
};
export type AsmrParticlesHandle = {
  spawn: (x: number, y: number, palette: ParticlePalette, count: number) => void;
  clear: () => void;
};

type Particle = {
  id: number;
  createdAt: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  gravity: number;
  size: number;
  color: string;
  shape: ParticleShape;
};

const DURATION_MS = 680;
const MAX_PARTICLES = 24;
let nextId = 0;

const ParticleView = memo(function ParticleView({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.linear });
    return () => cancelAnimation(progress);
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.85,
    transform: [
      { translateX: particle.dx * progress.value },
      { translateY: particle.dy * progress.value + particle.gravity * progress.value ** 2 },
      { scale: 1 - progress.value * 0.35 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x - particle.size / 2,
          top: particle.y - particle.size / 2,
          width: particle.size * (particle.shape === 'droplet' ? 0.75 : 1),
          height: particle.size * (particle.shape === 'droplet' ? 1.3 : 1),
          borderRadius: particle.shape === 'square' ? 2 : particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
});

/** React only mounts bursts; their movement and fading run entirely on the UI thread. */
export const AsmrParticles = forwardRef<AsmrParticlesHandle>(function AsmrParticles(_props, ref) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useImperativeHandle(
    ref,
    () => ({
      clear: () => setParticles([]),
      spawn: (x, y, palette, count) => {
        const now = Date.now();
        const burst = Array.from({ length: count }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = (Math.random() + 0.5) * palette.speed * 8;
          return {
            id: nextId++,
            createdAt: now,
            x,
            y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed - 18,
            gravity: palette.gravity * 150,
            size: 5 + Math.random() * 7,
            color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
            shape: palette.shape,
          };
        });
        setParticles((current) =>
          [...current.filter((particle) => now - particle.createdAt < DURATION_MS), ...burst].slice(
            -MAX_PARTICLES,
          ),
        );
      },
    }),
    [],
  );
  useEffect(() => {
    if (particles.length === 0) return;
    const timeout = setTimeout(() => setParticles([]), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [particles]);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {particles.map((particle) => (
        <ParticleView key={particle.id} particle={particle} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({ particle: { position: 'absolute' } });
