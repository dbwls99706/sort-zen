import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { Confetti } from './Confetti';
import { SoundManager } from '../audio/SoundManager';
import { Haptic } from '../utils/haptics';
import { useProgressStore } from '../store/progressStore';

const STAR_DELAYS = [100, 240, 380];
const ENTRY_DURATION_MS = 220;

type ClearModalProps = {
  visible: boolean;
  level: number;
  moveCount: number;
  mode: 'classic' | 'zen';
  stars: 1 | 2 | 3;
  coinReward: number;
  busy?: boolean;
  onNextLevel: () => void;
  onMenu: () => void;
};

function RewardStar({
  earned,
  index,
  visible,
}: {
  earned: boolean;
  index: number;
  visible: boolean;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = visible && !reducedMotion ? 0.5 : 1;
    if (visible && !reducedMotion)
      scale.value = withDelay(STAR_DELAYS[index], withSpring(1, { damping: 12, stiffness: 230 }));
    return () => cancelAnimation(scale);
  }, [visible, reducedMotion, index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text
      style={[
        styles.star,
        index === 1 && styles.middleStar,
        style,
        { color: earned ? '#DCA951' : theme.border },
      ]}
    >
      {earned ? '★' : '☆'}
    </Animated.Text>
  );
}

export function ClearModal({
  visible,
  level,
  moveCount,
  mode,
  stars,
  coinReward,
  busy = false,
  onNextLevel,
  onMenu,
}: ClearModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const daily = useProgressStore((s) => s.daily);
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const acted = useRef(false);
  const sharing = useRef(false);

  useEffect(() => {
    acted.current = false;
    if (!visible) {
      opacity.value = 0;
      translateY.value = 20;
      return;
    }
    opacity.value = withTiming(1, { duration: reducedMotion ? 0 : ENTRY_DURATION_MS });
    translateY.value = withTiming(0, { duration: reducedMotion ? 0 : ENTRY_DURATION_MS });
    const timers = STAR_DELAYS.slice(0, stars).map((delay, index) =>
      setTimeout(() => {
        SoundManager.playCelebrationNote(index, stars);
        Haptic.light();
      }, delay),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [visible, stars, reducedMotion, opacity, translateY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const leave = (action: () => void) => {
    if (busy || acted.current) return;
    acted.current = true;
    action();
  };
  const handleShare = async () => {
    if (busy || sharing.current) return;
    sharing.current = true;
    SoundManager.play('button_tap');
    Haptic.light();
    const starsText = '★'.repeat(stars);
    const message =
      mode === 'classic'
        ? t('share_message_classic', { n: level, m: moveCount, s: starsText })
        : t('share_message_zen', { m: moveCount, s: starsText });
    try {
      await Share.share({ message });
    } catch {
      // A cancelled or unavailable share sheet does not interrupt the next puzzle.
    } finally {
      sharing.current = false;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => leave(onMenu)}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.overlay}>
        {visible && !reducedMotion && (
          <Confetti
            colors={theme.colors}
            originX={width / 2}
            originY={height * 0.35}
            seed={level * 97 + moveCount * 13 + stars}
            intensity={stars}
          />
        )}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.card,
              cardStyle,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.eyebrow, { color: theme.accentInk }]}>{t('clear_eyebrow')}</Text>
            <View
              style={[styles.medallion, { backgroundColor: theme.hero }]}
              accessible
              accessibilityLabel={`${stars} / 3 ★`}
            >
              <View style={[styles.medallionRing, { borderColor: theme.border }]} />
              <View style={styles.starRow}>
                {[0, 1, 2].map((index) => (
                  <RewardStar key={index} index={index} earned={index < stars} visible={visible} />
                ))}
              </View>
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
              {mode === 'classic' ? `${t('level')} ${level}` : t('zen')} {t('clear')}
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {t('clear_message')}
            </Text>
            <View style={[styles.results, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.result}>
                <Text style={[styles.resultValue, { color: theme.text }]}>{moveCount}</Text>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
                  {t('moves')}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.result}>
                <Text style={[styles.resultValue, { color: theme.accentInk }]}>+{coinReward}</Text>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
                  {t('coins')}
                </Text>
              </View>
            </View>
            {daily && !daily.claimed && (
              <View style={[styles.daily, { borderColor: theme.border }]}>
                <Text style={[styles.dailyText, { color: theme.textSecondary }]}>
                  {t('daily_challenge')}
                </Text>
                <Text style={[styles.dailyValue, { color: theme.accentInk }]}>
                  {daily.completed
                    ? `✓ ${t('challenge_done')}`
                    : `${Math.min(daily.progress, daily.goal)} / ${daily.goal}`}
                </Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => leave(onNextLevel)}
              style={({ pressed }) => [
                styles.next,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.nextText, { color: theme.accentText }]}>
                {mode === 'classic' ? t('next_level') : t('new_puzzle')}
              </Text>
              <Text style={[styles.nextArrow, { color: theme.accentText }]}>→</Text>
            </Pressable>
            <View style={styles.secondaryActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => leave(onMenu)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
                  {t('menu')}
                </Text>
              </Pressable>
              <View style={[styles.secondaryDivider, { backgroundColor: theme.border }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={handleShare}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
                  {t('share')} ↗
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,30,27,0.58)' },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 12,
    alignItems: 'center',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  medallion: {
    width: 172,
    height: 132,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  medallionRing: {
    position: 'absolute',
    width: 184,
    height: 144,
    borderRadius: 90,
    borderWidth: 1,
    transform: [{ rotate: '-12deg' }],
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  star: { fontSize: 43 },
  middleStar: { fontSize: 58, marginBottom: 20 },
  title: {
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  message: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 5 },
  results: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 22,
    paddingVertical: 16,
  },
  result: { flex: 1, alignItems: 'center', gap: 5 },
  resultValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  resultLabel: { fontSize: 11, fontWeight: '500' },
  divider: { width: 1, height: 32 },
  daily: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 0,
    paddingBottom: 18,
  },
  dailyText: { fontSize: 12 },
  dailyValue: { fontSize: 12, fontWeight: '700' },
  next: {
    width: '100%',
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nextText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  nextArrow: { fontSize: 23 },
  secondaryActions: { flexDirection: 'row', width: '100%', alignItems: 'center', marginTop: 6 },
  secondary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  secondaryText: { fontSize: 12, fontWeight: '600' },
  secondaryDivider: { width: 1, height: 14 },
  pressed: { opacity: 0.7 },
});
