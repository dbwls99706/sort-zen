import React from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { Confetti } from './Confetti';
import { SoundManager } from '../audio/SoundManager';
import { Haptic } from '../utils/haptics';
import { useProgressStore } from '../store/progressStore';

const STAR_DELAYS = [170, 360, 550];
const BUTTONS_READY_MS = 820;

type ClearModalProps = {
  visible: boolean;
  level: number;
  moveCount: number;
  mode: 'classic' | 'zen';
  stars: 1 | 2 | 3;
  coinReward: number;
  onNextLevel: () => void;
  onMenu: () => void;
};

export function ClearModal({
  visible,
  level,
  moveCount,
  mode,
  stars,
  coinReward,
  onNextLevel,
  onMenu,
}: ClearModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const daily = useProgressStore((s) => s.daily);
  const streak = useProgressStore((s) => s.dailyStreak);
  const [displayReward, setDisplayReward] = React.useState(0);
  const [buttonsReady, setButtonsReady] = React.useState(false);

  const dailyParts: string[] = [];
  if (daily && !daily.claimed) {
    dailyParts.push(
      `⚡ ${
        daily.completed
          ? t('challenge_done')
          : `${Math.min(daily.progress, daily.goal)}/${daily.goal}`
      }`,
    );
  }
  if (streak > 0) {
    dailyParts.push(`🔥 ${t('daily_streak', { n: streak })}`);
  }
  const dailyLine = dailyParts.join('  ·  ');

  const cardScale = useSharedValue(0.72);
  const cardOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const rewardScale = useSharedValue(0.75);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);

  React.useEffect(() => {
    const starValues = [s0, s1, s2];
    let rewardInterval: ReturnType<typeof setInterval> | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (visible) {
      setDisplayReward(0);
      setButtonsReady(false);
      cardOpacity.value = withTiming(1, { duration: 170 });
      cardScale.value = withSpring(1, { damping: 10, stiffness: 190 });
      titleScale.value = withDelay(
        70,
        withSpring(1, { damping: 7, stiffness: 225 }),
      );
      glowOpacity.value = withSequence(
        withTiming(0.8, { duration: 180 }),
        withTiming(0.18, {
          duration: 850,
          easing: Easing.out(Easing.quad),
        }),
      );

      starValues.forEach((value, index) => {
        value.value =
          index < stars
            ? withDelay(
                STAR_DELAYS[index],
                withSequence(
                  withSpring(1.22, { damping: 6, stiffness: 220 }),
                  withSpring(1, { damping: 8, stiffness: 210 }),
                ),
              )
            : withDelay(100, withTiming(1, { duration: 160 }));

        if (index < stars) {
          timers.push(
            setTimeout(() => {
              SoundManager.playCelebrationNote(index, stars);
              Haptic.light();
            }, STAR_DELAYS[index]),
          );
        }
      });

      const rewardStart = STAR_DELAYS[stars - 1] + 180;
      const rewardSteps = Math.max(6, Math.min(14, coinReward));
      timers.push(
        setTimeout(() => {
          rewardScale.value = withSequence(
            withSpring(1.16, { damping: 7, stiffness: 230 }),
            withSpring(1, { damping: 9, stiffness: 210 }),
          );
          let step = 0;
          rewardInterval = setInterval(() => {
            step += 1;
            const next = Math.min(
              coinReward,
              Math.round((coinReward * step) / rewardSteps),
            );
            setDisplayReward(next);
            if (next >= coinReward && rewardInterval) {
              clearInterval(rewardInterval);
              rewardInterval = null;
              SoundManager.play('coin');
              Haptic.medium();
            }
          }, 42);
        }, rewardStart),
      );

      const buttonsReadyAt = Math.max(
        BUTTONS_READY_MS,
        rewardStart + rewardSteps * 42 + 90,
      );
      timers.push(setTimeout(() => setButtonsReady(true), buttonsReadyAt));
    } else {
      setDisplayReward(0);
      setButtonsReady(false);
      cardOpacity.value = 0;
      cardScale.value = 0.72;
      titleScale.value = 0.5;
      glowOpacity.value = 0;
      rewardScale.value = 0.75;
      starValues.forEach((value) => {
        value.value = 0;
      });
    }

    return () => {
      timers.forEach(clearTimeout);
      if (rewardInterval) clearInterval(rewardInterval);
    };
  }, [
    visible,
    stars,
    coinReward,
    cardOpacity,
    cardScale,
    titleScale,
    glowOpacity,
    rewardScale,
    s0,
    s1,
    s2,
  ]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));
  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
  }));
  const starStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: s0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] })),
  ];

  const handleShare = async () => {
    SoundManager.play('button_tap');
    Haptic.light();
    const starsText = '★'.repeat(stars);
    const message =
      mode === 'classic'
        ? t('share_message_classic', {
            n: level,
            m: moveCount,
            s: starsText,
          })
        : t('share_message_zen', { m: moveCount, s: starsText });
    try {
      await Share.share({ message });
    } catch {
      // 공유 시트 취소/미지원은 사용자 오류가 아니다.
    }
  };

  const seed = level * 97 + moveCount * 13 + stars;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {visible && (
          <>
            <Confetti
              colors={theme.colors}
              originX={screenW / 2}
              originY={screenH * 0.34}
              seed={seed}
              intensity={stars}
            />
            {stars === 3 && (
              <>
                <Confetti
                  colors={theme.colors}
                  originX={screenW * 0.24}
                  originY={screenH * 0.42}
                  seed={seed + 11}
                  intensity={2}
                  delayMs={180}
                />
                <Confetti
                  colors={theme.colors}
                  originX={screenW * 0.76}
                  originY={screenH * 0.42}
                  seed={seed + 23}
                  intensity={2}
                  delayMs={240}
                />
              </>
            )}
          </>
        )}

        <Animated.View
          style={[
            styles.cardGlow,
            glowStyle,
            { backgroundColor: theme.accent },
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            { backgroundColor: theme.surface },
          ]}
        >
          <View style={styles.starRow}>
            {starStyles.map((style, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.star,
                  style,
                  index >= stars && styles.starDim,
                ]}
              >
                ★
              </Animated.Text>
            ))}
          </View>

          <Animated.Text
            style={[styles.title, titleStyle, { color: theme.text }]}
          >
            {mode === 'classic' ? `${t('level')} ${level}` : t('zen')}{' '}
            {t('clear')}
          </Animated.Text>
          <Text style={[styles.moves, { color: theme.textSecondary }]}> 
            {moveCount} {t('moves')}
          </Text>
          <Animated.Text
            style={[
              styles.reward,
              rewardStyle,
              !dailyLine && styles.rewardSolo,
              { color: theme.accent },
            ]}
          >
            +{displayReward} 🪙
          </Animated.Text>

          {!!dailyLine && (
            <Text style={[styles.dailyHook, { color: theme.textSecondary }]}> 
              {dailyLine}
            </Text>
          )}

          <Pressable
            disabled={!buttonsReady}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent },
              !buttonsReady && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={onNextLevel}
          >
            <Text style={styles.buttonText}>
              {mode === 'classic' ? t('next_level') : t('new_puzzle')}
            </Text>
          </Pressable>

          <Pressable
            disabled={!buttonsReady}
            style={({ pressed }) => [
              styles.shareButton,
              { borderColor: theme.accent },
              !buttonsReady && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleShare}
          >
            <Text style={[styles.shareButtonText, { color: theme.accent }]}> 
              {t('share')}
            </Text>
          </Pressable>

          <Pressable
            disabled={!buttonsReady}
            style={({ pressed }) => [
              styles.menuButton,
              !buttonsReady && styles.buttonDisabled,
              pressed && styles.menuPressed,
            ]}
            onPress={onMenu}
          >
            <Text
              style={[styles.menuButtonText, { color: theme.textSecondary }]}
            >
              {t('menu')}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.43)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGlow: {
    position: 'absolute',
    width: 298,
    height: 420,
    borderRadius: 34,
    transform: [{ scale: 1.04 }],
  },
  card: {
    width: 292,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 30,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 14,
  },
  starRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 12,
  },
  star: {
    fontSize: 43,
    color: '#FFD44A',
    textShadowColor: 'rgba(255,185,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  starDim: {
    color: '#D5D5D5',
    textShadowColor: 'transparent',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moves: {
    fontSize: 14,
    marginBottom: 10,
  },
  reward: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  rewardSolo: {
    marginBottom: 24,
  },
  dailyHook: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  menuButtonText: {
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
  menuPressed: {
    opacity: 0.55,
  },
});
