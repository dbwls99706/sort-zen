import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { AsmrParticles, type AsmrParticlesHandle } from '../../src/components/asmr/AsmrParticles';
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
  particleShape: 'circle' | 'cloud' | 'square' | 'droplet';
};

const MAX_BLOB_SIZE = 360;
const FEEDBACK_INTERVAL_MS = 118;
const IMPACT_INTERVAL_MS = 175;

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
    particleShape: 'droplet',
  },
];

export default function ASMRSensoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const [activeMaterial, setActiveMaterial] = useState(MATERIALS[0]);
  const [blobSize, setBlobSize] = useState(MAX_BLOB_SIZE);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const active = focused && appActive;
  const activeRef = useRef(active);
  activeRef.current = active;
  const materialRef = useRef(activeMaterial);
  materialRef.current = activeMaterial;
  const particles = useRef<AsmrParticlesHandle>(null);
  const squeezing = useRef(false);
  const lastFeedback = useRef(0);
  const lastImpact = useRef(0);

  const stopInteraction = useCallback(() => {
    squeezing.current = false;
    SoundManager.stopLoop();
    SoundManager.setBgmDucked(false);
    particles.current?.clear();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        activeRef.current = false;
        setFocused(false);
        stopInteraction();
        SoundManager.stopBGM();
      };
    }, [stopInteraction]),
  );

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state !== 'active') {
        activeRef.current = false;
        stopInteraction();
        SoundManager.stopBGM();
      }
    });
    return () => listener.remove();
  }, [stopInteraction]);

  useEffect(() => {
    if (active) SoundManager.playBGM('zen');
    // Blur/background handlers stop audio immediately. A later state-effect
    // cleanup could otherwise stop music just started by the next screen.
  }, [active]);

  useEffect(() => {
    if (active) SoundManager.preloadAsmr(activeMaterial.material);
  }, [active, activeMaterial.material]);

  const spawnParticles = useCallback((x: number, y: number, count: number) => {
    const material = materialRef.current;
    particles.current?.spawn(
      x,
      y,
      {
        colors: material.particleColors,
        speed: material.particleSpeed,
        gravity: material.particleGravity,
        shape: material.particleShape,
      },
      count,
    );
  }, []);

  const handleSqueezeStart = useCallback(
    (x: number, y: number) => {
      if (!activeRef.current) return;
      const material = materialRef.current;
      squeezing.current = true;
      lastFeedback.current = Date.now();
      lastImpact.current = lastFeedback.current;
      SoundManager.setBgmDucked(true);
      SoundManager.startLoop(material.material, 0.46);
      SoundManager.playImpact(material.material);
      if (material.material === 'sponge') Haptic.heavy();
      else Haptic.medium();
      spawnParticles(x, y, material.material === 'water' ? 8 : 4);
    },
    [spawnParticles],
  );

  const handleSqueezeMove = useCallback(
    (x: number, y: number, speed: number) => {
      if (!activeRef.current || !squeezing.current) return;
      const material = materialRef.current;
      const now = Date.now();
      SoundManager.setLoopVolume(0.28 + Math.min(0.62, speed / 24));
      if (speed > 1.5 && now - lastFeedback.current > FEEDBACK_INTERVAL_MS) {
        Haptic.light();
        spawnParticles(x, y, material.material === 'water' ? 4 : 2);
        lastFeedback.current = now;
      }
      if (speed > 9 && now - lastImpact.current > IMPACT_INTERVAL_MS) {
        SoundManager.playImpact(material.material, 0.82);
        lastImpact.current = now;
      }
    },
    [spawnParticles],
  );

  const handleRelease = useCallback(() => {
    const wasSqueezing = squeezing.current;
    squeezing.current = false;
    SoundManager.stopLoop();
    SoundManager.setBgmDucked(false);
    if (wasSqueezing && activeRef.current) {
      SoundManager.playImpact(materialRef.current.material, 0.24);
    }
  }, []);

  const selectMaterial = (material: ASMRMaterial) => {
    if (material.id === materialRef.current.id) return;
    stopInteraction();
    materialRef.current = material;
    setActiveMaterial(material);
    SoundManager.play('button_tap');
    Haptic.light();
    SoundManager.playImpact(material.material, 0.58);
  };

  const materialName = language === 'ko' ? activeMaterial.nameKo : activeMaterial.name;
  const materialDescription = language === 'ko' ? activeMaterial.descKo : activeMaterial.descEn;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu')}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
          onPress={() => {
            activeRef.current = false;
            stopInteraction();
            SoundManager.play('button_tap');
            Haptic.light();
            router.back();
          }}
        >
          <Text style={[styles.backText, { color: theme.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{t('asmr_room')}</Text>
        <View style={[styles.soundBadge, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.soundIcon, { color: theme.accent }]}>♫</Text>
        </View>
      </View>

      <View style={styles.descriptionArea}>
        <Text style={[styles.kicker, { color: theme.accent }]}>ASMR</Text>
        <Text style={[styles.descTitle, { color: theme.text }]}>{materialName}</Text>
        <Text style={[styles.descSub, { color: theme.textSecondary }]}>{materialDescription}</Text>
      </View>

      <View
        style={styles.playSpace}
        onLayout={({ nativeEvent: { layout } }) => {
          const next = Math.floor(
            Math.max(1, Math.min(MAX_BLOB_SIZE, layout.width, layout.height)),
          );
          setBlobSize((current) => (current === next ? current : next));
        }}
      >
        <View style={{ width: blobSize, height: blobSize }}>
          <View
            pointerEvents="none"
            style={[
              styles.aura,
              {
                backgroundColor: activeMaterial.colors[0],
                width: blobSize * 0.84,
                height: blobSize * 0.84,
                borderRadius: blobSize,
                left: blobSize * 0.08,
                top: blobSize * 0.08,
              },
            ]}
          />
          <SoftBodyBlob
            key={activeMaterial.id}
            size={blobSize}
            outerColor={activeMaterial.colors[0]}
            innerColor={activeMaterial.colors[1]}
            physics={activeMaterial.blob}
            shape={activeMaterial.blobShape}
            resetKey={activeMaterial.id}
            enabled={active}
            accessibilityLabel={`${materialName}. ${materialDescription}`}
            onSqueezeStart={handleSqueezeStart}
            onSqueezeMove={handleSqueezeMove}
            onRelease={handleRelease}
          />
          <MaterialEffects
            material={activeMaterial.material}
            size={blobSize}
            primary={activeMaterial.colors[0]}
            secondary={activeMaterial.colors[1]}
            active={active}
          />
          <AsmrParticles ref={particles} />
        </View>
      </View>

      <View
        style={[
          styles.selectorContainer,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {MATERIALS.map((material) => {
          const selected = material.id === activeMaterial.id;
          const label = language === 'ko' ? material.labelKo : material.labelEn;
          return (
            <Pressable
              key={material.id}
              accessibilityRole="button"
              accessibilityLabel={language === 'ko' ? material.nameKo : material.name}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.selectorItem,
                {
                  backgroundColor: selected ? theme.accentSoft : 'transparent',
                  borderColor: selected ? theme.accent : 'transparent',
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
              onPress={() => selectMaterial(material)}
            >
              <View
                style={[
                  styles.selectorDot,
                  {
                    backgroundColor: material.colors[0],
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.selectorText,
                  {
                    color: selected ? theme.accent : theme.textSecondary,
                  },
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { fontSize: 34, lineHeight: 37 },
  title: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
  soundBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: { fontSize: 22 },
  descriptionArea: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 4,
  },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 10 },
  descTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 10,
    textAlign: 'center',
  },
  descSub: { fontSize: 13, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  playSpace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  aura: { position: 'absolute', opacity: 0.08 },
  selectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 7,
    gap: 3,
    borderRadius: 24,
    borderWidth: 1,
  },
  selectorItem: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
  },
  selectorDot: { width: 27, height: 27, borderRadius: 11, borderWidth: 1, marginBottom: 8 },
  selectorText: { fontSize: 11, fontWeight: '600' },
});
