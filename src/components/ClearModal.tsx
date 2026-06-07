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
  onNextLevel: () => void;
  onMenu: () => void;
};

export function ClearModal({
  visible,
  level,
  moveCount,
  mode,
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
    const stars = [s0, s1, s2];
    if (visible) {
      cardOpacity.value = withTiming(1, { duration: 180 });
      cardScale.value = withSpring(1, { damping: 11, stiffness: 180 });
      stars.forEach((s, i) => {
        s.value = withDelay(
          STAR_DELAYS[i],
          withSpring(1, { damping: 6, stiffness: 210 }),
        );
      });
    } else {
      cardOpacity.value = 0;
      cardScale.value = 0.7;
      stars.forEach((s) => {
        s.value = 0;
      });
    }
  }, [visible, cardOpacity, cardScale, s0, s1, s2]);

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
              <Animated.Text key={i} style={[styles.star, st]}>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moves: {
    fontSize: 14,
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
