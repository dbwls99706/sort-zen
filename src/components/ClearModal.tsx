import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { Confetti } from './Confetti';
import { SoundManager } from '../audio/SoundManager';
import { Haptic } from '../utils/haptics';
import { useProgressStore } from '../store/progressStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAR_DELAYS = [0, 110, 220];

type ClearModalProps = {
  visible: boolean;
  level: number;
  moveCount: number;
  mode: 'classic' | 'zen';
  /** 무브 효율 별점 1~3 (T145) */
  stars: 1 | 2 | 3;
  /** 별점에 따른 코인 보상 */
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
  const daily = useProgressStore((s) => s.daily);
  const streak = useProgressStore((s) => s.dailyStreak);

  // 데일리 진행/스트릭 훅 (T121) — 클리어 직후 다음 목표를 보여준다
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

  const cardScale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.5);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);

  React.useEffect(() => {
    const starsAnim = [s0, s1, s2];
    if (visible) {
      cardOpacity.value = withTiming(1, { duration: 180 });
      cardScale.value = withSpring(1, { damping: 11, stiffness: 180 });
      // 제목이 별보다 먼저 통통 튀어 올라 "클리어!" 순간을 강조한다.
      titleScale.value = withDelay(
        90,
        withSpring(1, { damping: 7, stiffness: 220 }),
      );
      starsAnim.forEach((s, i) => {
        // 획득한 별만 통통 튀고, 미획득 별은 흐리게 바로 표시
        s.value =
          i < stars
            ? withDelay(
                STAR_DELAYS[i],
                withSpring(1, { damping: 6, stiffness: 210 }),
              )
            : withTiming(1, { duration: 150 });
      });
    } else {
      cardOpacity.value = 0;
      cardScale.value = 0.7;
      titleScale.value = 0.5;
      starsAnim.forEach((s) => {
        s.value = 0;
      });
    }
  }, [visible, stars, cardOpacity, cardScale, titleScale, s0, s1, s2]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const starStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: s0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] })),
  ];

  // 클리어 결과 공유 (T120) — OS 공유 시트
  const handleShare = async () => {
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
      /* 공유 시트 취소/미지원 무시 */
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {visible && (
          <Confetti
            colors={theme.colors}
            originX={SCREEN_W / 2}
            originY={SCREEN_H * 0.36}
          />
        )}
        <Animated.View
          style={[styles.card, cardStyle, { backgroundColor: theme.surface }]}
        >
          <View style={styles.starRow}>
            {starStyles.map((st, i) => (
              <Animated.Text
                key={i}
                style={[styles.star, st, i >= stars && styles.starDim]}
              >
                ★
              </Animated.Text>
            ))}
          </View>
          <Animated.Text style={[styles.title, titleStyle, { color: theme.text }]}>
            {mode === 'classic' ? `${t('level')} ${level}` : t('zen')}{' '}
            {t('clear')}
          </Animated.Text>
          <Text style={[styles.moves, { color: theme.textSecondary }]}>
            {moveCount} {t('moves')}
          </Text>
          <Text
            style={[
              styles.reward,
              !dailyLine && styles.rewardSolo,
              { color: theme.accent },
            ]}
          >
            +{coinReward} 🪙
          </Text>
          {!!dailyLine && (
            <Text style={[styles.dailyHook, { color: theme.textSecondary }]}>
              {dailyLine}
            </Text>
          )}

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onNextLevel}
          >
            <Text style={styles.buttonText}>
              {mode === 'classic' ? t('next_level') : t('new_puzzle')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.shareButton, { borderColor: theme.accent }]}
            onPress={handleShare}
          >
            <Text style={[styles.shareButtonText, { color: theme.accent }]}>
              {t('share')}
            </Text>
          </Pressable>

          <Pressable style={styles.menuButton} onPress={onMenu}>
            <Text style={[styles.menuButtonText, { color: theme.textSecondary }]}>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 280,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  star: {
    fontSize: 40,
    color: '#FFD700',
  },
  starDim: {
    color: '#D5D5D5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moves: {
    fontSize: 14,
    marginBottom: 8,
  },
  reward: {
    fontSize: 16,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  menuButton: {
    paddingVertical: 8,
  },
  menuButtonText: {
    fontSize: 14,
  },
});
