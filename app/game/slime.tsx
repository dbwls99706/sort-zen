import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type GestureResponderEvent,
  type PanResponderGestureState,
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
import {
  SoftBodyBlob,
  type BlobPhysics,
  type BlobShape,
} from '../../src/components/asmr/SoftBodyBlob';

type ASMRMaterial = {
  id: string;
  name: string;
  nameKo: string;
  soundKey: 'slime' | 'shaving_cream' | 'handcream' | 'sponge' | 'water_pour';
  colors: string[];
  particleColors: string[];
  descKo: string;
  descEn: string;
  /** Skia 소프트바디 거동 (점성·탄성·압축·추종) */
  blob: BlobPhysics;
  /** 정지 실루엣 (재질별 모양 차이) */
  blobShape: BlobShape;
  particleSpeed: number;
  particleGravity: number;
  screenShakeFactor: number;
  particleShape: 'circle' | 'cloud' | 'square' | 'droplet';
};

const BLOB_SIZE = 320;

const MATERIALS: ASMRMaterial[] = [
  {
    id: 'slime',
    name: 'Gooey Slime',
    nameKo: '말랑 슬라임',
    soundKey: 'slime',
    colors: ['#96E6A1', '#D4FC79'],
    particleColors: ['#E3FFB2', '#A1E8AF', '#7CE0A6'],
    descKo: '쫀득하고 말랑한 슬라임입니다. 쭉 늘리며 만져보세요.',
    descEn: 'Squeeze and stretch the gooey slime to relax.',
    // 끈적: 낮은 표면장력(물컹 늘어남)·중간 부피보존·점성(곧 멈춤)
    blob: { pressure: 0.35, tension: 0.12, friction: 0.84 },
    // 세로로 긴 물방울 실루엣
    blobShape: { scale: 1.0, lobes: 0, lobeAmp: 0, aspectX: 0.94, aspectY: 1.1 },
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
    colors: ['#80DEEA', '#E0F7FA'],
    particleColors: ['#FFFFFF', '#E0F7FA', '#B2EBF2'],
    descKo: '몽글몽글하고 푹신한 크림입니다. 만지면 부풀어 오릅니다.',
    descEn: 'Squish and spread the fluffy shaving cream.',
    // 푹신: 낮은 부피보존(쉽게 눌림)·부드러운 막·빨리 안정
    blob: { pressure: 0.3, tension: 0.14, friction: 0.8 },
    // 몽글몽글 부푼 구름 실루엣
    blobShape: { scale: 1.12, lobes: 8, lobeAmp: 0.07, aspectX: 1, aspectY: 1 },
    particleSpeed: 1.8,
    particleGravity: 0.05,
    screenShakeFactor: 0.08,
    particleShape: 'cloud',
  },
  {
    id: 'handcream',
    name: 'Soft Lotion',
    nameKo: '촉촉 핸드크림',
    soundKey: 'handcream',
    colors: ['#F48FB1', '#F8BBD0'],
    particleColors: ['#FFF0F5', '#F8BBD0', '#F1A7C4'],
    descKo: '부드럽고 매끄러운 로션입니다. 화면 전체를 미끄러지듯 문지르세요.',
    descEn: 'Rub the silky smooth lotion for calming sounds.',
    // 매끈한 유체: 중간 부피보존·매끈한 막·중마찰
    blob: { pressure: 0.4, tension: 0.18, friction: 0.85 },
    // 매끈한 가로 타원
    blobShape: { scale: 1.0, lobes: 0, lobeAmp: 0, aspectX: 1.12, aspectY: 0.93 },
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
    colors: ['#FFF176', '#FFF59D'],
    particleColors: ['#FFF9C4', '#FFF59D', '#FBC02D'],
    descKo: '폭신한 스펀지입니다. 꽉 쥐어 짜면 강하게 수축했다가 튕겨납니다.',
    descEn: 'Squeeze the porous sponge and enjoy the crackles.',
    // 단단: 높은 부피보존+높은 막강성(형태 유지·빨리 튕겨 복원)·낮은 마찰
    blob: { pressure: 0.7, tension: 0.5, friction: 0.74 },
    // 모서리 있는 사각(스퀴클) 실루엣
    blobShape: { scale: 0.96, lobes: 4, lobeAmp: 0.14, aspectX: 1, aspectY: 1 },
    particleSpeed: 7.0,
    particleGravity: 0.32,
    screenShakeFactor: 0.35,
    particleShape: 'square',
  },
  {
    id: 'water',
    name: 'Water Splash',
    nameKo: '찰랑찰랑 물',
    soundKey: 'water_pour',
    colors: ['#4FC3F7', '#B3E5FC'],
    particleColors: ['#E1F5FE', '#B3E5FC', '#0288D1'],
    descKo: '시원한 물입니다. 찰랑거리는 파도와 함께 물을 튀겨보세요.',
    descEn: 'Stir and splash clear water for bubbling ASMR.',
    // 찰랑: 높은 부피보존(비압축)+강한 표면장력(둥글게 복원)·높은 마찰(오래 출렁)
    blob: { pressure: 0.85, tension: 0.4, friction: 0.9 },
    // 넓적한 가로 타원 (수면처럼)
    blobShape: { scale: 1.0, lobes: 0, lobeAmp: 0, aspectX: 1.16, aspectY: 0.88 },
    particleSpeed: 8.5,
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

  // 화면 흔들림(카메라) — 블롭 물리와 별개로 손맛을 키운다
  const screenTranslateX = useSharedValue(0);
  const screenTranslateY = useSharedValue(0);
  const screenRotate = useSharedValue(0);

  const lastSoundTime = useRef(0);

  const activeMaterialRef = useRef(activeMaterial);
  useEffect(() => {
    activeMaterialRef.current = activeMaterial;
  }, [activeMaterial]);

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
          y: clientY - 120,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (mat.id === 'water' ? 4 : 2),
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

  // 블롭 → 부모로 전달되는 제스처 콜백 (사운드/햅틱/파티클/카메라 흔들림 오케스트레이션)
  const handleSqueezeStart = useCallback(
    (e: GestureResponderEvent) => {
      const mat = activeMaterialRef.current;
      const { pageX, pageY } = e.nativeEvent;
      SoundManager.play(mat.soundKey);
      if (mat.id === 'sponge') Haptic.heavy();
      else Haptic.medium();

      screenTranslateX.value = withTiming((rand() - 0.5) * 25 * mat.screenShakeFactor, { duration: 60 });
      screenTranslateY.value = withTiming((rand() - 0.5) * 25 * mat.screenShakeFactor, { duration: 60 });
      screenRotate.value = withTiming((rand() - 0.5) * 0.08 * mat.screenShakeFactor, { duration: 60 });

      spawnParticles(pageX, pageY, mat.id === 'water' ? 18 : 6);
    },
    [spawnParticles, screenTranslateX, screenTranslateY, screenRotate],
  );

  const handleSqueezeMove = useCallback(
    (e: GestureResponderEvent, g: PanResponderGestureState) => {
      const mat = activeMaterialRef.current;
      const { pageX, pageY } = e.nativeEvent;
      const { dx, dy } = g;

      screenTranslateX.value = dx * 0.18 * mat.screenShakeFactor;
      screenTranslateY.value = dy * 0.18 * mat.screenShakeFactor;
      screenRotate.value = (dx / 400) * 0.08 * mat.screenShakeFactor;

      const now = nowMs();
      const distance = Math.sqrt(dx * dx + dy * dy);
      const throttleTime = mat.id === 'water' ? 65 : 110;
      if (distance > 12 && now - lastSoundTime.current > throttleTime) {
        SoundManager.play(mat.soundKey);
        Haptic.light();
        spawnParticles(pageX, pageY, mat.id === 'water' ? 6 : 2);
        lastSoundTime.current = now;
      }
    },
    [spawnParticles, screenTranslateX, screenTranslateY, screenRotate],
  );

  const handleRelease = useCallback(() => {
    screenTranslateX.value = withSpring(0, { damping: 12, stiffness: 90 });
    screenTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    screenRotate.value = withSpring(0, { damping: 12, stiffness: 90 });
  }, [screenTranslateX, screenTranslateY, screenRotate]);

  // BGM
  useEffect(() => {
    SoundManager.playBGM('zen');
    return () => {
      SoundManager.stopBGM();
    };
  }, []);

  // 파티클 물리 업데이트 루프
  useEffect(() => {
    let animFrameId: number;
    const update = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + activeMaterial.particleGravity,
            opacity: Math.max(0, p.opacity - 0.022),
          }))
          .filter((p) => p.opacity > 0),
      );
      animFrameId = requestAnimationFrame(update);
    };
    animFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeMaterial]);

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
    SoundManager.play('button_tap');
    Haptic.light();
    setActiveMaterial(material);
    SoundManager.play(material.soundKey);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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

      <Animated.View style={[styles.shakingContainer, animatedScreenStyle]}>
        <Animated.View
          style={[styles.bgAura1, bgAura1Style, { backgroundColor: activeMaterial.colors[0] }]}
        />
        <Animated.View
          style={[styles.bgAura2, bgAura2Style, { backgroundColor: activeMaterial.colors[1] }]}
        />

        <View style={styles.descriptionArea}>
          <Text style={[styles.descTitle, { color: theme.text }]}>
            {activeMaterial.nameKo}
          </Text>
          <Text style={[styles.descSub, { color: theme.textSecondary }]}>
            {activeMaterial.descKo}
          </Text>
        </View>

        <View style={styles.playSpace}>
          {particles.map((p) => {
            let borderRadius = p.size / 2;
            let width = p.size;
            let height = p.size;

            if (p.shape === 'square') {
              borderRadius = 2;
            } else if (p.shape === 'cloud') {
              borderRadius = p.size / 3;
            } else if (p.shape === 'droplet') {
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
        </View>
      </Animated.View>

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
              <View style={[styles.selectorDot, { backgroundColor: m.colors[0] }]} />
              <Text
                style={[styles.selectorText, { color: isActive ? '#FFFFFF' : theme.text }]}
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
