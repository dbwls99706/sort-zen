import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
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

  const cardScale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);

  React.useEffect(() => {
    const starsAnim = [s0, s1, s2];
    if (visible) {
      cardOpacity.value = withTiming(1, { duration: 180 });
      cardScale.value = withSpring(1, { damping: 11, stiffness: 180 });
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
      starsAnim.forEach((s) => {
        s.value = 0;
      });
    }
  }, [visible, stars, cardOpacity, cardScale, s0, s1, s2]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const starStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: s0.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] })),
  ];

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
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'classic' ? `${t('level')} ${level}` : t('zen')}{' '}
            {t('clear')}
          </Text>
          <Text style={[styles.moves, { color: theme.textSecondary }]}>
            {moveCount} {t('moves')}
          </Text>
          <Text style={[styles.reward, { color: theme.accent }]}>
            +{coinReward} 🪙
          </Text>

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onNextLevel}
          >
            <Text style={styles.buttonText}>
              {mode === 'classic' ? t('next_level') : t('new_puzzle')}
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
  menuButton: {
    paddingVertical: 8,
  },
  menuButtonText: {
    fontSize: 14,
  },
});
