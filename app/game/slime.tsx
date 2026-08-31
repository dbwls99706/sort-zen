import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/components/ThemeProvider';
import { SoundManager } from '../../src/audio/SoundManager';
import { type AsmrMaterial } from '../../src/audio/asmrPools';
import { Haptic } from '../../src/utils/haptics';
import {
  SoftBodyBlob,
  type BlobPhysics,
  type BlobShape,
} from '../../src/components/asmr/SoftBodyBlob';
import { MaterialEffects } from '../../src/components/asmr/MaterialEffects';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTranslation } from '../../src/i18n';

type ASMRMaterial = {
  id: string;
  name: string;
  nameKo: string;
  labelKo: string;
  labelEn: string;
  material: AsmrMaterial;
  colors: string[];
  particleColors: string[];
  descKo: string;
  descEn: string;
  blob: BlobPhysics;
  blobShape: BlobShape;
  particleSpeed: number;
  particleGravity: number;
  screenShakeFactor: number;
  particleShape: 'circle' | 'cloud' | 'square' | 'droplet';
};

const BLOB_SIZE = 320;
const PARTICLE_FRAME_MS = 32;

const MATERIALS: ASMRMaterial[] = [
  {
    id: 'slime',
    name: 'Gooey Slime',
    nameKo: '말랑 슬라임',
    labelKo: '슬라임',
    labelEn: 'Slime',
    material: 'slime',
    colors: ['#96E6A1', '#D4FC79'],
    particleColors: ['#E3FFB2', '#A1E8AF', '#7CE0A6'],
    descKo: '쫀득하고 말랑한 슬라임입니다. 쭉 늘리며 만져보세요.',
    descEn: 'Squeeze and stretch the gooey slime to relax.',
    blob: { pressure: 0.3, tension: 0.08, friction: 0.86 },
    blobShape: {
      scale: 1,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 0.94,
      aspectY: 1.1,
    },
    particleSpeed: 3.5,
    particleGravity: 0.1,
    screenShakeFactor: 0.15,
    particleShape: 'circle',
  },
  {
    id: 'shaving_cream',
    name: 'Shaving Cream',
    nameKo: '쉐이빙 크림',
    labelKo: '쉐이빙',
    labelEn: 'Foam',
    material: 'shaving',
    colors: ['#80DEEA', '#E0F7FA'],
    particleColors: ['#FFFFFF', '#E0F7FA', '#B2EBF2'],
    descKo: '몽글몽글하고 푹신한 크림입니다. 만지면 부풀어 오릅니다.',
    descEn: 'Squish and spread the fluffy shaving cream.',
    blob: { pressure: 0.45, tension: 0.2, friction: 0.78 },
    blobShape: {
      scale: 1.12,
      lobes: 8,
      lobeAmp: 0.07,
      aspectX: 1,
      aspectY: 1,
    },
    particleSpeed: 1.8,
    particleGravity: 0.05,
    screenShakeFactor: 0.08,
    particleShape: 'cloud',
  },
  {
    id: 'handcream',
    name: 'Soft Lotion',
    nameKo: '촉촉 핸드크림',
    labelKo: '로션',
    labelEn: 'Lotion',
    material: 'handcream',
    colors: ['#F48FB1', '#F8BBD0'],
    particleColors: ['#FFF0F5', '#F8BBD0', '#F1A7C4'],
    descKo: '부드럽고 매끄러운 로션입니다. 화면 전체를 미끄러지듯 문지르세요.',
    descEn: 'Rub the silky smooth lotion for calming sounds.',
    blob: { pressure: 0.72, tension: 0.2, friction: 0.86 },
    blobShape: {
      scale: 1.14,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 1.12,
      aspectY: 0.93,
    },
    particleSpeed: 4.5,
    particleGravity: 0.16,
    screenShakeFactor: 0.26,
    particleShape: 'droplet',
  },
  {
    id: 'sponge',
    name: 'Sensory Sponge',
    nameKo: '구멍 숑숑 스펀지',
    labelKo: '스펀지',
    labelEn: 'Sponge',
    material: 'sponge',
    colors: ['#FFF176', '#FFF59D'],
    particleColors: ['#FFF9C4', '#FFF59D', '#FBC02D'],
    descKo: '폭신한 스펀지입니다. 꽉 쥐어 짜면 강하게 수축했다가 튕겨납니다.',
    descEn: 'Squeeze the porous sponge and enjoy the crackles.',
    blob: { pressure: 0.85, tension: 0.65, friction: 0.7 },
    blobShape: {
      scale: 0.96,
      lobes: 4,
      lobeAmp: 0.14,
      aspectX: 1,
      aspectY: 1,
    },
    particleSpeed: 7,
    particleGravity: 0.32,
    screenShakeFactor: 0.32,
    particleShape: 'square',
  },
  {
    id: 'water',
    name: 'Water Splash',
    nameKo: '찰랑찰랑 물',
    labelKo: '물',
    labelEn: 'Water',
    material: 'water',
    colors: ['#4FC3F7', '#B3E5FC'],
    particleColors: ['#E1F5FE', '#B3E5FC', '#0288D1'],
    descKo: '시원한 물입니다. 찰랑거리는 파도와 함께 물을 튀겨보세요.',
    descEn: 'Stir and splash clear water for bubbling ASMR.',
    blob: { pressure: 1, tension: 0.4, friction: 0.93 },
    blobShape: {
      scale: 1.14,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 1.16,
      aspectY: 0.88,
    },
    particleSpeed: 10.5,
    particleGravity: 0.45,
    screenShakeFactor: 0.42,
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

function rand(): number {
  return Math.random();
}

function nowMs(): number {
  return Date.now();
}

export default function ASMRSensoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);

  const [activeMaterial, setActiveMaterial] = useState<ASMRMaterial>(
    MATERIALS[0],
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const activeMaterialRef = useRef(activeMaterial);
  const particlesRef = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);
  const particleFrameRef = useRef<number | null>(null);
  const lastParticleFrameRef = useRef(0);
  const playSpaceRef = useRef<View>(null);
  const playSpaceOrigin = useRef({ x: 0, y: 0 });

  const screenTranslateX = useSharedValue(0);
  const screenTranslateY = useSharedValue(0);
  const screenRotate = useSharedValue(0);

  const lastSoundTime = useRef(0);
  const lastTapTime = useRef(0);
  const lastLoopVolTime = useRef(0);

  useEffect(() => {
    activeMaterialRef.current = activeMaterial;
  }, [activeMaterial]);

  const measurePlaySpace = useCallback(() => {
    playSpaceRef.current?.measureInWindow((x, y) => {
      playSpaceOrigin.current = { x, y };
    });
  }, []);

  const startParticleLoop = useCallback(() => {
    if (particleFrameRef.current !== null) return;
    lastParticleFrameRef.current = 0;

    const update = (timestamp: number) => {
      if (
        lastParticleFrameRef.current > 0 &&
        timestamp - lastParticleFrameRef.current < PARTICLE_FRAME_MS
      ) {
        particleFrameRef.current = requestAnimationFrame(update);
        return;
      }
      lastParticleFrameRef.current = timestamp;

      const gravity = activeMaterialRef.current.particleGravity;
      const next = particlesRef.current
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + gravity * 1.7,
          opacity: Math.max(0, particle.opacity - 0.038),
        }))
        .filter((particle) => particle.opacity > 0);

      particlesRef.current = next;
      setParticles(next);
      if (next.length === 0) {
        particleFrameRef.current = null;
        return;
      }
      particleFrameRef.current = requestAnimationFrame(update);
    };

    particleFrameRef.current = requestAnimationFrame(update);
  }, []);

  const spawnParticles = useCallback(
    (absoluteX: number, absoluteY: number, count = 3) => {
      const material = activeMaterialRef.current;
      const localX = absoluteX - playSpaceOrigin.current.x;
      const localY = absoluteY - playSpaceOrigin.current.y;
      const newParticles: Particle[] = [];

      for (let index = 0; index < count; index++) {
        const angle = rand() * Math.PI * 2;
        const speed =
          (rand() * 4 + 2.5) * material.particleSpeed * 0.45;
        newParticles.push({
          id: particleIdRef.current++,
          x: localX,
          y: localY,
          vx: Math.cos(angle) * speed,
          vy:
            Math.sin(angle) * speed -
            (material.material === 'water' ? 4.8 : 2.2),
          color:
            material.particleColors[
              Math.floor(rand() * material.particleColors.length)
            ],
          size: rand() * 9 + 6,
          opacity: 1,
          shape: material.particleShape,
        });
      }

      const limit = material.material === 'water' ? 64 : 42;
      const next = [...particlesRef.current, ...newParticles].slice(-limit);
      particlesRef.current = next;
      setParticles(next);
      startParticleLoop();
    },
    [startParticleLoop],
  );

  const handleSqueezeStart = useCallback(
    (x: number, y: number) => {
      const material = activeMaterialRef.current;
      SoundManager.setBgmDucked(true);
      SoundManager.startLoop(material.material, 0.46);
      SoundManager.playImpact(material.material);
      lastTapTime.current = nowMs();
      if (material.material === 'sponge') Haptic.heavy();
      else Haptic.medium();

      screenTranslateX.value = withTiming(
        (rand() - 0.5) * 25 * material.screenShakeFactor,
        { duration: 60 },
      );
      screenTranslateY.value = withTiming(
        (rand() - 0.5) * 25 * material.screenShakeFactor,
        { duration: 60 },
      );
      screenRotate.value = withTiming(
        (rand() - 0.5) * 0.08 * material.screenShakeFactor,
        { duration: 60 },
      );

      spawnParticles(x, y, material.material === 'water' ? 16 : 6);
    },
    [spawnParticles, screenTranslateX, screenTranslateY, screenRotate],
  );

  const handleSqueezeMove = useCallback(
    (x: number, y: number, speed: number) => {
      const material = activeMaterialRef.current;
      const shake = Math.min(1, speed / 18);
      screenTranslateX.value = withTiming(
        (rand() - 0.5) * 20 * material.screenShakeFactor * shake,
        { duration: 50 },
      );
      screenTranslateY.value = withTiming(
        (rand() - 0.5) * 20 * material.screenShakeFactor * shake,
        { duration: 50 },
      );
      screenRotate.value = withTiming(
        (rand() - 0.5) * 0.055 * material.screenShakeFactor * shake,
        { duration: 50 },
      );

      const now = nowMs();
      if (now - lastLoopVolTime.current > 55) {
        SoundManager.setLoopVolume(0.28 + Math.min(0.62, speed / 24));
        lastLoopVolTime.current = now;
      }

      const throttleTime = material.material === 'water' ? 72 : 118;
      if (speed > 1.5 && now - lastSoundTime.current > throttleTime) {
        Haptic.light();
        const base = material.material === 'water' ? 5 : 2;
        spawnParticles(
          x,
          y,
          base + Math.min(7, Math.round(speed * 0.52)),
        );
        lastSoundTime.current = now;
      }

      if (speed > 9 && now - lastTapTime.current > 175) {
        SoundManager.playImpact(material.material, 0.82);
        lastTapTime.current = now;
      }
    },
    [spawnParticles, screenTranslateX, screenTranslateY, screenRotate],
  );

  const handleRelease = useCallback(() => {
    const material = activeMaterialRef.current;
    SoundManager.stopLoop();
    SoundManager.setBgmDucked(false);
    SoundManager.playImpact(material.material, 0.24);
    screenTranslateX.value = withSpring(0, { damping: 12, stiffness: 90 });
    screenTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    screenRotate.value = withSpring(0, { damping: 12, stiffness: 90 });
  }, [screenTranslateX, screenTranslateY, screenRotate]);

  useEffect(() => {
    SoundManager.playBGM('zen');
    SoundManager.preloadAsmr();
    return () => {
      if (particleFrameRef.current !== null) {
        cancelAnimationFrame(particleFrameRef.current);
        particleFrameRef.current = null;
      }
      SoundManager.setBgmDucked(false);
      SoundManager.stopLoop();
      SoundManager.stopBGM();
    };
  }, []);

  const animatedScreenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: screenTranslateX.value },
      { translateY: screenTranslateY.value },
      { rotate: `${screenRotate.value}rad` },
    ],
  }));

  const bgAura1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: screenTranslateX.value * -0.6 },
      { translateY: screenTranslateY.value * -0.6 },
    ],
  }));

  const bgAura2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: screenTranslateX.value * -0.3 },
      { translateY: screenTranslateY.value * -0.3 },
    ],
  }));

  const selectMaterial = (material: ASMRMaterial) => {
    SoundManager.stopLoop();
    SoundManager.setBgmDucked(false);
    SoundManager.play('button_tap');
    Haptic.light();
    particlesRef.current = [];
    setParticles([]);
    setActiveMaterial(material);
    SoundManager.playImpact(material.material, 0.58);
  };

  const materialName =
    language === 'ko' ? activeMaterial.nameKo : activeMaterial.name;
  const materialDescription =
    language === 'ko' ? activeMaterial.descKo : activeMaterial.descEn;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.surface },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            SoundManager.play('button_tap');
            Haptic.light();
            router.back();
          }}
        >
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}> 
          {t('asmr_room')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View style={[styles.shakingContainer, animatedScreenStyle]}>
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

        <View style={styles.descriptionArea}>
          <Text style={[styles.descTitle, { color: theme.text }]}> 
            {materialName}
          </Text>
          <Text style={[styles.descSub, { color: theme.textSecondary }]}> 
            {materialDescription}
          </Text>
        </View>

        <View
          ref={playSpaceRef}
          style={styles.playSpace}
          onLayout={measurePlaySpace}
        >
          {particles.map((particle) => {
            let borderRadius = particle.size / 2;
            let width = particle.size;
            let height = particle.size;

            if (particle.shape === 'square') {
              borderRadius = 2;
            } else if (particle.shape === 'cloud') {
              borderRadius = particle.size / 3;
            } else if (particle.shape === 'droplet') {
              width = particle.size * 0.75;
              height = particle.size * 1.35;
              borderRadius = particle.size / 2;
            }

            return (
              <View
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    left: particle.x - width / 2,
                    top: particle.y - height / 2,
                    width,
                    height,
                    borderRadius,
                    backgroundColor: particle.color,
                    opacity: particle.opacity,
                  },
                ]}
              />
            );
          })}

          <SoftBodyBlob
            size={BLOB_SIZE}
            outerColor={activeMaterial.colors[0]}
            innerColor={activeMaterial.colors[1]}
            physics={activeMaterial.blob}
            shape={activeMaterial.blobShape}
            resetKey={activeMaterial.id}
            onSqueezeStart={handleSqueezeStart}
            onSqueezeMove={handleSqueezeMove}
            onRelease={handleRelease}
          />
          <MaterialEffects
            material={activeMaterial.material}
            size={BLOB_SIZE}
            primary={activeMaterial.colors[0]}
            secondary={activeMaterial.colors[1]}
          />
        </View>
      </Animated.View>

      <View style={styles.selectorContainer}>
        {MATERIALS.map((material) => {
          const isActive = material.id === activeMaterial.id;
          const label =
            language === 'ko' ? material.labelKo : material.labelEn;
          return (
            <Pressable
              key={material.id}
              style={({ pressed }) => [
                styles.selectorItem,
                {
                  backgroundColor: isActive ? theme.accent : theme.surface,
                  borderColor: isActive ? theme.accent : 'transparent',
                },
                pressed && styles.selectorPressed,
              ]}
              onPress={() => selectMaterial(material)}
            >
              <View
                style={[
                  styles.selectorDot,
                  { backgroundColor: material.colors[0] },
                ]}
              />
              <Text
                style={[
                  styles.selectorText,
                  { color: isActive ? '#FFFFFF' : theme.text },
                ]}
              >
                {label}
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
  headerSpacer: {
    width: 40,
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
    borderWidth: 1,
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
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.72,
  },
  selectorPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
});
