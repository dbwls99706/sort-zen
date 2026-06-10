import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/components/ThemeProvider';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';

type ASMRMaterial = {
  id: string;
  name: string;
  nameKo: string;
  soundKey: 'slime' | 'shaving_cream' | 'handcream' | 'sponge' | 'water_pour';
  colors: string[];
  particleColors: string[];
  descKo: string;
  descEn: string;
  // Dynamic physics config
  scaleMultiplier: number; // target scale during touch
  dragFactor: number;      // how far the blob stretches with finger
  stiffness: number;       // spring stiffness for return
  damping: number;         // spring damping for return
  elasticity: number;      // skew distortion amount
  particleSpeed: number;   // velocity multiplier
  particleGravity: number; // gravity acceleration
  screenShakeFactor: number; // camera translation intensity
  particleShape: 'circle' | 'cloud' | 'square' | 'droplet';
};

const MATERIALS: ASMRMaterial[] = [
  {
    id: 'slime',
    name: 'Gooey Slime',
    nameKo: '말랑 슬라임',
    soundKey: 'slime',
    colors: ['#D4FC79', '#96E6A1'],
    particleColors: ['#E3FFB2', '#A1E8AF', '#7CE0A6'],
    descKo: '쫀득하고 말랑한 슬라임입니다. 쭉 늘리며 만져보세요.',
    descEn: 'Squeeze and stretch the gooey slime to relax.',
    scaleMultiplier: 0.88,
    dragFactor: 0.85,    // highly stretchy
    stiffness: 45,       // gooey sluggish snapback
    damping: 7,         // bouncy wobbling
    elasticity: 1.3,     // stretches/skews heavily
    particleSpeed: 3.5,
    particleGravity: 0.1,
    screenShakeFactor: 0.15,
    particleShape: 'circle',
  },
  {
    id: 'shaving_cream',
    name: 'Shaving Cream',
    nameKo: '쉐이빙 크림',
    soundKey: 'shaving_cream',
    colors: ['#E0F7FA', '#80DEEA'],
    particleColors: ['#FFFFFF', '#E0F7FA', '#B2EBF2'],
    descKo: '몽글몽글하고 푹신한 크림입니다. 만지면 부풀어 오릅니다.',
    descEn: 'Squish and spread the fluffy shaving cream.',
    scaleMultiplier: 1.18, // puffs up when touched!
    dragFactor: 0.3,     // stays in place
    stiffness: 85,
    damping: 14,
    elasticity: 0.45,
    particleSpeed: 1.8,
    particleGravity: 0.05, // cloud foam drifts slowly
    screenShakeFactor: 0.08,
    particleShape: 'cloud',
  },
  {
    id: 'handcream',
    name: 'Soft Lotion',
    nameKo: '촉촉 핸드크림',
    soundKey: 'handcream',
    colors: ['#F8BBD0', '#F48FB1'],
    particleColors: ['#FFF0F5', '#F8BBD0', '#F1A7C4'],
    descKo: '부드럽고 매끄러운 로션입니다. 화면 전체를 미끄러지듯 문지르세요.',
    descEn: 'Rub the silky smooth lotion for calming sounds.',
    scaleMultiplier: 0.95,
    dragFactor: 0.95,    // very slippery, glides around
    stiffness: 30,       // slow smooth slide return
    damping: 11,
    elasticity: 0.8,
    particleSpeed: 2.8,
    particleGravity: 0.16,
    screenShakeFactor: 0.12,
    particleShape: 'droplet',
  },
  {
    id: 'sponge',
    name: 'Sensory Sponge',
    nameKo: '구멍 숑숑 스펀지',
    soundKey: 'sponge',
    colors: ['#FFF59D', '#FFF176'],
    particleColors: ['#FFF9C4', '#FFF59D', '#FBC02D'],
    descKo: '폭신한 스펀지입니다. 꽉 쥐어 짜면 강하게 수축했다가 튕겨납니다.',
    descEn: 'Squeeze the porous sponge and enjoy the crackles.',
    scaleMultiplier: 0.58, // squishes heavily!
    dragFactor: 0.15,    // stiff material
    stiffness: 240,      // extremely fast snapback
    damping: 20,         // high damping, instant restore
    elasticity: 0.25,
    particleSpeed: 7.0,  // crumbs shoot out fast!
    particleGravity: 0.32,
    screenShakeFactor: 0.35, // shakes the screen strongly
    particleShape: 'square',
  },
  {
    id: 'water',
    name: 'Water Splash',
    nameKo: '찰랑찰랑 물',
    soundKey: 'water_pour',
    colors: ['#B3E5FC', '#4FC3F7'],
    particleColors: ['#E1F5FE', '#B3E5FC', '#0288D1'],
    descKo: '시원한 물입니다. 찰랑거리는 파도와 함께 물을 튀겨보세요.',
    descEn: 'Stir and splash clear water for bubbling ASMR.',
    scaleMultiplier: 1.0,  // stays original scale, just ripples
    dragFactor: 0.6,
    stiffness: 140,      // high frequency ripple
    damping: 4.8,        // low damping for lots of slosh oscillations
    elasticity: 1.6,     // heavy wavy distortion
    particleSpeed: 8.5,  // high velocity splashes
    particleGravity: 0.45,
    screenShakeFactor: 0.26,
    particleShape: 'droplet',
  },
];

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  shape: 'circle' | 'cloud' | 'square' | 'droplet';
};

// 난수/시간은 제스처 이벤트 핸들러에서만 쓰이는 의도된 비순수 호출이다.
// 모듈 스코프 경계로 감싸 렌더 순수성 규칙과의 충돌을 피한다.
function rand(): number {
  return Math.random();
}
function nowMs(): number {
  return Date.now();
}

export default function ASMRSensoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [activeMaterial, setActiveMaterial] = useState<ASMRMaterial>(MATERIALS[0]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  // Blob dynamic variables
  const blobScale = useSharedValue(1);
  const blobTranslateX = useSharedValue(0);
  const blobTranslateY = useSharedValue(0);
  const blobSkewX = useSharedValue(0);
  const blobSkewY = useSharedValue(0);

  // Camera / Screen Shake dynamic variables
  const screenTranslateX = useSharedValue(0);
  const screenTranslateY = useSharedValue(0);
  const screenRotate = useSharedValue(0);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastSoundTime = useRef(0);
  const initialLocalPos = useRef({ x: 0, y: 0 });

  // Corner deformation shared values (representing border-radius multiplier)
  const radiusPctTL = useSharedValue(1);
  const radiusPctTR = useSharedValue(1);
  const radiusPctBL = useSharedValue(1);
  const radiusPctBR = useSharedValue(1);

  // Reference to prevent stale closures inside PanResponder
  const activeMaterialRef = useRef(activeMaterial);
  useEffect(() => {
    activeMaterialRef.current = activeMaterial;
  }, [activeMaterial]);

  // Soft-body localized corner deformation logic
  const updateDeformation = useCallback((lx: number, ly: number) => {
    const dist = Math.sqrt(lx * lx + ly * ly);
    if (dist < 5) return;
    const nx = lx / dist;
    const ny = ly / dist;

    // elasticity determines how soft/flexible the deformation is
    const intensity = Math.min(1.2, dist / 120) * activeMaterialRef.current.elasticity;

    const corners = [
      { name: 'tl', dx: -0.707, dy: -0.707 },
      { name: 'tr', dx: 0.707, dy: -0.707 },
      { name: 'bl', dx: -0.707, dy: 0.707 },
      { name: 'br', dx: 0.707, dy: 0.707 },
    ];

    corners.forEach((c) => {
      const dot = c.dx * nx + c.dy * ny;
      let targetPct = 1.0;
      if (dot > 0) {
        // Dent in (reduce radius) - touch is close to this corner
        const maxDent = activeMaterialRef.current.id === 'sponge' ? 0.65 : 0.55;
        targetPct = 1.0 - maxDent * dot * intensity;
      } else {
        // Bulge out (increase radius) - touch is on the opposite side
        const maxBulge = activeMaterialRef.current.id === 'sponge' ? 0.08 : 0.28;
        targetPct = 1.0 + maxBulge * (-dot) * intensity;
      }

      targetPct = Math.max(0.15, Math.min(1.85, targetPct));

      if (c.name === 'tl') radiusPctTL.value = withTiming(targetPct, { duration: 80 });
      if (c.name === 'tr') radiusPctTR.value = withTiming(targetPct, { duration: 80 });
      if (c.name === 'bl') radiusPctBL.value = withTiming(targetPct, { duration: 80 });
      if (c.name === 'br') radiusPctBR.value = withTiming(targetPct, { duration: 80 });
    });
  }, [radiusPctTL, radiusPctTR, radiusPctBL, radiusPctBR]);

  // Splatters — 항상 ref로 현재 재질을 읽어 안정적인 콜백을 유지한다.
  const spawnParticles = useCallback(
    (clientX: number, clientY: number, count = 3) => {
      const mat = activeMaterialRef.current;
      const newParticles: Particle[] = [];
      const colors = mat.particleColors;
      const mult = mat.particleSpeed;

      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const speed = (rand() * 4 + 2.5) * mult * 0.45;
        newParticles.push({
          id: particleIdRef.current++,
          x: clientX,
          y: clientY - 120, // offset
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (mat.id === 'water' ? 4 : 2), // upward boost
          color: colors[Math.floor(rand() * colors.length)],
          size: rand() * 9 + 6,
          opacity: 1,
          shape: mat.particleShape,
        });
      }

      const limit = mat.id === 'water' ? 75 : 45;
      setParticles((prev) => [...prev, ...newParticles].slice(-limit));
    },
    [],
  );

  // PanResponder to handle both touches (mobile) and mouse clicks/drags (web)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const pageX = evt.nativeEvent.pageX || gestureState.x0;
        const pageY = evt.nativeEvent.pageY || gestureState.y0;
        dragStartPos.current = { x: pageX, y: pageY };

        const locationX = evt.nativeEvent.locationX ?? 120;
        const locationY = evt.nativeEvent.locationY ?? 120;
        initialLocalPos.current = { x: locationX - 120, y: locationY - 120 };
        
        const mat = activeMaterialRef.current;
        blobScale.value = withTiming(mat.scaleMultiplier, { duration: 90 });
        SoundManager.play(mat.soundKey);

        if (mat.id === 'sponge') {
          Haptic.heavy();
        } else {
          Haptic.medium();
        }
        
        screenTranslateX.value = withTiming((rand() - 0.5) * 25 * mat.screenShakeFactor, { duration: 60 });
        screenTranslateY.value = withTiming((rand() - 0.5) * 25 * mat.screenShakeFactor, { duration: 60 });
        screenRotate.value = withTiming((rand() - 0.5) * 0.08 * mat.screenShakeFactor, { duration: 60 });

        updateDeformation(locationX - 120, locationY - 120);

        // Spawn extra particles for water splash!
        const initialCount = mat.id === 'water' ? 18 : 6;
        spawnParticles(pageX, pageY, initialCount);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const pageX = (evt.nativeEvent.pageX || gestureState.moveX) || (dragStartPos.current.x + dx);
        const pageY = (evt.nativeEvent.pageY || gestureState.moveY) || (dragStartPos.current.y + dy);

        const mat = activeMaterialRef.current;

        // Apply material specific stretch & distort
        blobTranslateX.value = dx * mat.dragFactor;
        blobTranslateY.value = dy * mat.dragFactor;
        
        // Elastic skew deformation
        blobSkewX.value = (dx / 320) * mat.elasticity;
        blobSkewY.value = (dy / 320) * mat.elasticity;

        // Camera wobbling following the finger displacement
        screenTranslateX.value = dx * 0.18 * mat.screenShakeFactor;
        screenTranslateY.value = dy * 0.18 * mat.screenShakeFactor;
        screenRotate.value = (dx / 400) * 0.08 * mat.screenShakeFactor;

        // Localized squishy deformation based on current touch position relative to center
        const localX = initialLocalPos.current.x + dx;
        const localY = initialLocalPos.current.y + dy;
        updateDeformation(localX, localY);

        // Throttle sounds and spawning
        const now = nowMs();
        const distance = Math.sqrt(dx * dx + dy * dy);
        const throttleTime = mat.id === 'water' ? 65 : 110;
        if (distance > 12 && now - lastSoundTime.current > throttleTime) {
          SoundManager.play(mat.soundKey);
          Haptic.light();
          const moveCount = mat.id === 'water' ? 6 : 2;
          spawnParticles(pageX, pageY, moveCount);
          lastSoundTime.current = now;
        }
      },
      onPanResponderRelease: () => {
        const mat = activeMaterialRef.current;
        const returnConfig = {
          damping: mat.damping,
          stiffness: mat.stiffness,
        };

        // Elastic bounce back
        blobScale.value = withSpring(1, returnConfig);
        blobTranslateX.value = withSpring(0, returnConfig);
        blobTranslateY.value = withSpring(0, returnConfig);
        blobSkewX.value = withSpring(0, returnConfig);
        blobSkewY.value = withSpring(0, returnConfig);

        radiusPctTL.value = withSpring(1, returnConfig);
        radiusPctTR.value = withSpring(1, returnConfig);
        radiusPctBL.value = withSpring(1, returnConfig);
        radiusPctBR.value = withSpring(1, returnConfig);

        // Screen snaps back to center
        screenTranslateX.value = withSpring(0, { damping: 12, stiffness: 90 });
        screenTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
        screenRotate.value = withSpring(0, { damping: 12, stiffness: 90 });
      },
      onPanResponderTerminate: () => {
        const mat = activeMaterialRef.current;
        const returnConfig = {
          damping: mat.damping,
          stiffness: mat.stiffness,
        };

        // Elastic bounce back
        blobScale.value = withSpring(1, returnConfig);
        blobTranslateX.value = withSpring(0, returnConfig);
        blobTranslateY.value = withSpring(0, returnConfig);
        blobSkewX.value = withSpring(0, returnConfig);
        blobSkewY.value = withSpring(0, returnConfig);

        radiusPctTL.value = withSpring(1, returnConfig);
        radiusPctTR.value = withSpring(1, returnConfig);
        radiusPctBL.value = withSpring(1, returnConfig);
        radiusPctBR.value = withSpring(1, returnConfig);

        // Screen snaps back to center
        screenTranslateX.value = withSpring(0, { damping: 12, stiffness: 90 });
        screenTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
        screenRotate.value = withSpring(0, { damping: 12, stiffness: 90 });
      },
      }),
    [
      updateDeformation,
      spawnParticles,
      blobScale,
      blobTranslateX,
      blobTranslateY,
      blobSkewX,
      blobSkewY,
      screenTranslateX,
      screenTranslateY,
      screenRotate,
      radiusPctTL,
      radiusPctTR,
      radiusPctBL,
      radiusPctBR,
    ],
  );

  // Play BGM quietly
  useEffect(() => {
    SoundManager.playBGM('zen');
    return () => {
      SoundManager.stopBGM();
    };
  }, []);

  // Reset deformations when active material changes
  useEffect(() => {
    blobScale.value = withTiming(1, { duration: 0 });
    blobTranslateX.value = withTiming(0, { duration: 0 });
    blobTranslateY.value = withTiming(0, { duration: 0 });
    blobSkewX.value = withTiming(0, { duration: 0 });
    blobSkewY.value = withTiming(0, { duration: 0 });

    radiusPctTL.value = withTiming(1, { duration: 0 });
    radiusPctTR.value = withTiming(1, { duration: 0 });
    radiusPctBL.value = withTiming(1, { duration: 0 });
    radiusPctBR.value = withTiming(1, { duration: 0 });
  }, [
    activeMaterial.id,
    blobScale,
    blobTranslateX,
    blobTranslateY,
    blobSkewX,
    blobSkewY,
    radiusPctTL,
    radiusPctTR,
    radiusPctBL,
    radiusPctBR,
  ]);

  // Frame physics update
  useEffect(() => {
    let animFrameId: number;
    const update = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + activeMaterial.particleGravity, // custom gravity
            opacity: Math.max(0, p.opacity - 0.022),
          }))
          .filter((p) => p.opacity > 0)
      );
      animFrameId = requestAnimationFrame(update);
    };
    animFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeMaterial]);

  const animatedBlobStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: blobScale.value },
        { translateX: blobTranslateX.value },
        { translateY: blobTranslateY.value },
        { skewX: `${blobSkewX.value}rad` },
        { skewY: `${blobSkewY.value}rad` },
      ],
    };
  });

  const animatedLayer1Style = useAnimatedStyle(() => {
    return {
      borderTopLeftRadius: 125 * radiusPctTL.value,
      borderTopRightRadius: 125 * radiusPctTR.value,
      borderBottomLeftRadius: 125 * radiusPctBL.value,
      borderBottomRightRadius: 125 * radiusPctBR.value,
    };
  });

  const animatedLayer2Style = useAnimatedStyle(() => {
    return {
      borderTopLeftRadius: 115 * radiusPctTL.value,
      borderTopRightRadius: 115 * radiusPctTR.value,
      borderBottomLeftRadius: 115 * radiusPctBL.value,
      borderBottomRightRadius: 115 * radiusPctBR.value,
    };
  });

  const animatedLayer3Style = useAnimatedStyle(() => {
    return {
      borderTopLeftRadius: 100 * radiusPctTL.value,
      borderTopRightRadius: 100 * radiusPctTR.value,
      borderBottomLeftRadius: 100 * radiusPctBL.value,
      borderBottomRightRadius: 100 * radiusPctBR.value,
    };
  });

  const animatedScreenStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: screenTranslateX.value },
        { translateY: screenTranslateY.value },
        { rotate: `${screenRotate.value}rad` },
      ],
    };
  });

  const bgAura1Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: screenTranslateX.value * -0.6 },
        { translateY: screenTranslateY.value * -0.6 },
      ],
    };
  });

  const bgAura2Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: screenTranslateX.value * -0.3 },
        { translateY: screenTranslateY.value * -0.3 },
      ],
    };
  });

  const selectMaterial = (material: ASMRMaterial) => {
    SoundManager.play('button_tap');
    Haptic.light();
    setActiveMaterial(material);
    // Splash
    SoundManager.play(material.soundKey);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={() => {
            SoundManager.play('button_tap');
            Haptic.light();
            router.back();
          }}
        >
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>ASMR Sensory Room</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Shakeable Play Frame */}
      <Animated.View style={[styles.shakingContainer, animatedScreenStyle]}>
        {/* Parallax Fluid Background Auras */}
        <Animated.View
          style={[
            styles.bgAura1,
            bgAura1Style,
            { backgroundColor: activeMaterial.colors[0] },
          ]}
        />
        <Animated.View
          style={[
            styles.bgAura2,
            bgAura2Style,
            { backgroundColor: activeMaterial.colors[1] },
          ]}
        />

        {/* Description */}
        <View style={styles.descriptionArea}>
          <Text style={[styles.descTitle, { color: theme.text }]}>
            {activeMaterial.nameKo}
          </Text>
          <Text style={[styles.descSub, { color: theme.textSecondary }]}>
            {activeMaterial.descKo}
          </Text>
        </View>

        {/* Interactive Play Space */}
        <View style={styles.playSpace}>
          {/* Dynamic Particles Overlay */}
          {particles.map((p) => {
            let borderRadius = p.size / 2;
            let width = p.size;
            let height = p.size;
            
            if (p.shape === 'square') {
              borderRadius = 2; // small square crumbs for sponge
            } else if (p.shape === 'cloud') {
              borderRadius = p.size / 3; // soft uneven cloud particles
            } else if (p.shape === 'droplet') {
              // make a tear droplet shape using varying aspect ratio
              width = p.size * 0.75;
              height = p.size * 1.35;
              borderRadius = p.size / 2;
            }

            return (
              <View
                key={p.id}
                style={[
                  styles.particle,
                  {
                    left: p.x - width / 2,
                    top: p.y - height / 2,
                    width,
                    height,
                    borderRadius,
                    backgroundColor: p.color,
                    opacity: p.opacity,
                  },
                ]}
              />
            );
          })}

          {/* Squishy Blob Container */}
          <Animated.View
            style={[styles.blobContainer, animatedBlobStyle]}
            {...panResponder.panHandlers}
          >
            {/* Layer 1 (Outer soft aura) */}
            <Animated.View
              style={[
                styles.blobLayer1,
                animatedLayer1Style,
                {
                  backgroundColor: activeMaterial.colors[0],
                  opacity: 0.25,
                },
              ]}
            />
            {/* Layer 2 (Middle thick jelly) */}
            <Animated.View
              style={[
                styles.blobLayer2,
                animatedLayer2Style,
                {
                  backgroundColor: activeMaterial.colors[0],
                  opacity: 0.55,
                },
              ]}
            />
            {/* Layer 3 (Inner glowing gel core) */}
            <Animated.View
              style={[
                styles.blobLayer3,
                animatedLayer3Style,
                {
                  backgroundColor: activeMaterial.colors[1],
                },
              ]}
            />
            {/* Soft light highlight */}
            <View style={styles.blobHighlight} />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Selector Row */}
      <View style={styles.selectorContainer}>
        {MATERIALS.map((m) => {
          const isActive = m.id === activeMaterial.id;
          return (
            <Pressable
              key={m.id}
              style={[
                styles.selectorItem,
                {
                  backgroundColor: isActive ? theme.accent : theme.surface,
                  borderColor: isActive ? theme.accent : 'transparent',
                },
              ]}
              onPress={() => selectMaterial(m)}
            >
              <View
                style={[
                  styles.selectorDot,
                  {
                    backgroundColor: m.colors[0],
                  },
                ]}
              />
              <Text
                style={[
                  styles.selectorText,
                  { color: isActive ? '#FFFFFF' : theme.text },
                ]}
              >
                {m.nameKo.split(' ')[1] || m.nameKo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  shakingContainer: {
    flex: 1,
    position: 'relative',
  },
  descriptionArea: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 24,
  },
  descTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  descSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  playSpace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  blobContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    cursor: 'pointer',
  },
  blobLayer1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  blobLayer2: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  blobLayer3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  blobHighlight: {
    position: 'absolute',
    top: 40,
    left: 50,
    width: 30,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-30deg' }],
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
    pointerEvents: 'none',
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 10,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  selectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  bgAura1: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.12,
    pointerEvents: 'none',
  },
  bgAura2: {
    position: 'absolute',
    bottom: '12%',
    right: '8%',
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.08,
    pointerEvents: 'none',
  },
});
