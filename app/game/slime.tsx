import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../src/components/ThemeProvider';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { SoftBodyBlob } from '../../src/components/asmr/SoftBodyBlob';
import { MATERIALS, type ASMRMaterial } from '../../src/components/asmr/materials';
import { SettingsIcon } from '../../src/components/SettingsIcon';
import { MaterialEffects } from '../../src/components/asmr/MaterialEffects';
import { AsmrParticles, type AsmrParticlesHandle } from '../../src/components/asmr/AsmrParticles';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTranslation } from '../../src/i18n';

const MAX_BLOB_SIZE = 360;
const FEEDBACK_INTERVAL_MS = 118;
const IMPACT_INTERVAL_MS = 175;

export default function ASMRSensoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const [activeMaterial, setActiveMaterial] = useState(MATERIALS[0]);
  const [blobSize, setBlobSize] = useState(MAX_BLOB_SIZE);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [interacting, setInteracting] = useState(false);
  const active = focused && appActive;
  const activeRef = useRef(active);
  activeRef.current = active;
  const materialRef = useRef(activeMaterial);
  materialRef.current = activeMaterial;
  const particles = useRef<AsmrParticlesHandle>(null);
  const squeezing = useRef(false);
  const lastFeedback = useRef(0);
  const lastImpact = useRef(0);
  const navigating = useRef(false);

  const stopInteraction = useCallback(() => {
    squeezing.current = false;
    setInteracting(false);
    SoundManager.stopAsmr();
    SoundManager.setBgmDucked(false);
    particles.current?.clear();
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
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
      if (!activeRef.current || materialRef.current.id !== activeMaterial.id) return;
      const material = materialRef.current;
      squeezing.current = true;
      setInteracting(true);
      lastFeedback.current = Date.now();
      lastImpact.current = lastFeedback.current;
      SoundManager.setBgmDucked(true);
      SoundManager.startLoop(material.material, 0.46);
      SoundManager.playImpact(material.material);
      if (material.material === 'sponge') Haptic.heavy();
      else Haptic.medium();
      spawnParticles(x, y, material.material === 'water' ? 8 : 4);
    },
    [spawnParticles, activeMaterial.id],
  );

  const handleSqueezeMove = useCallback(
    (x: number, y: number, speed: number) => {
      if (!activeRef.current || !squeezing.current || materialRef.current.id !== activeMaterial.id)
        return;
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
    [spawnParticles, activeMaterial.id],
  );

  const handleRelease = useCallback(() => {
    if (!squeezing.current || materialRef.current.id !== activeMaterial.id) return;
    squeezing.current = false;
    setInteracting(false);
    SoundManager.stopLoop();
    SoundManager.setBgmDucked(false);
    if (activeRef.current) {
      SoundManager.playImpact(materialRef.current.material, 0.24);
    }
  }, [activeMaterial.id]);

  const selectMaterial = (material: ASMRMaterial) => {
    if (!activeRef.current || material.id === materialRef.current.id) return;
    stopInteraction();
    materialRef.current = material;
    setActiveMaterial(material);
    SoundManager.play('button_tap');
    Haptic.light();
    SoundManager.playImpact(material.material, 0.58);
  };

  const materialName = language === 'ko' ? activeMaterial.nameKo : activeMaterial.name;
  const materialDescription = language === 'ko' ? activeMaterial.descKo : activeMaterial.descEn;
  const leave = (settings = false) => {
    if (navigating.current) return;
    navigating.current = true;
    activeRef.current = false;
    setFocused(false);
    stopInteraction();
    SoundManager.stopBGM();
    Haptic.light();
    if (settings) router.push('/settings');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
            onPress={() => leave()}
          >
            <Text style={[styles.backText, { color: theme.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.textSecondary }]}>{t('asmr_room')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
            onPress={() => leave(true)}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <SettingsIcon color={theme.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.descriptionArea}>
            <Text style={[styles.descTitle, { color: theme.text }]}>{materialName}</Text>
            <Text style={[styles.descSub, { color: theme.textSecondary }]}>
              {materialDescription}
            </Text>
          </View>

          <View
            style={styles.playSpace}
            onLayout={({ nativeEvent: { layout } }) => {
              const next = Math.floor(
                Math.max(1, Math.min(MAX_BLOB_SIZE, layout.width, layout.height)),
              );
              if (blobSize !== next && squeezing.current) stopInteraction();
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
                active={active && interacting}
              />
              <AsmrParticles ref={particles} />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.selectorContainer,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.selectorRow}
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
                      minWidth: 60 * Math.min(fontScale, 2),
                      maxWidth: 88 * Math.min(fontScale, 2),
                    },
                    {
                      backgroundColor: selected ? theme.accentSoft : 'transparent',
                      borderColor: selected ? theme.accentInk : 'transparent',
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
                        borderColor: selected ? theme.accentInk : theme.border,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.selectorText,
                      {
                        color: selected ? theme.accentInk : theme.textSecondary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1 },
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
  descriptionArea: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 4,
  },
  descTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  descSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 360 },
  playSpace: {
    flex: 1,
    minHeight: 240,
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
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorRow: { flexGrow: 1, padding: 8, gap: 8, justifyContent: 'space-between' },
  selectorItem: {
    flexGrow: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectorDot: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, marginBottom: 5 },
  selectorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
