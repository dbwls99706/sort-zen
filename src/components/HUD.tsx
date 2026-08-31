import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { HintIcon, PauseIcon, ResetIcon, UndoIcon } from './icons';

type HUDProps = {
  level: number;
  coins: number;
  mode: 'classic' | 'zen';
  moveCount: number;
  onHint: () => void;
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
};

export function HUD({
  level,
  coins,
  mode,
  moveCount,
  onHint,
  onUndo,
  onReset,
  onPause,
}: HUDProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const coinScale = useSharedValue(1);
  const moveScale = useSharedValue(1);
  const previousCoins = React.useRef(coins);
  const previousMoves = React.useRef(moveCount);

  React.useEffect(() => {
    if (coins !== previousCoins.current) {
      coinScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 8, stiffness: 230 }),
      );
      previousCoins.current = coins;
    }
  }, [coins, coinScale]);

  React.useEffect(() => {
    if (moveCount !== previousMoves.current) {
      moveScale.value = withSequence(
        withTiming(1.14, { duration: 80 }),
        withSpring(1, { damping: 9, stiffness: 230 }),
      );
      previousMoves.current = moveCount;
    }
  }, [moveCount, moveScale]);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));
  const moveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: moveScale.value }],
  }));

  const buttonStyle = ({ pressed }: { pressed: boolean }) => [
    styles.button,
    pressed && styles.buttonPressed,
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}> 
      <View style={styles.left}>
        <View style={styles.levelBlock}>
          <Text
            style={[styles.levelText, { color: theme.text }]}
            numberOfLines={1}
          >
            {mode === 'classic' ? `Lv.${level}` : t('zen')}
          </Text>
          <Animated.Text
            style={[
              styles.moveText,
              moveStyle,
              { color: theme.textSecondary },
            ]}
          >
            {moveCount} {t('moves')}
          </Animated.Text>
        </View>
        <Animated.Text
          style={[styles.coinText, coinStyle, { color: theme.accent }]}
          numberOfLines={1}
        >
          🪙 {coins}
        </Animated.Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onHint} style={buttonStyle} hitSlop={6}>
          <HintIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onUndo} style={buttonStyle} hitSlop={6}>
          <UndoIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onReset} style={buttonStyle} hitSlop={6}>
          <ResetIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onPause} style={buttonStyle} hitSlop={6}>
          <PauseIcon color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 12,
  },
  levelBlock: {
    flexShrink: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moveText: {
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  coinText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  buttonPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.62,
  },
});
