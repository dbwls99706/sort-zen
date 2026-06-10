import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { UndoIcon, ResetIcon, PauseIcon } from './icons';

type HUDProps = {
  level: number;
  coins: number;
  mode: 'classic' | 'zen';
  moveCount: number;
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
};

export function HUD({
  level,
  coins,
  mode,
  moveCount,
  onUndo,
  onReset,
  onPause,
}: HUDProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.left}>
        <Text style={[styles.levelText, { color: theme.text }]}>
          {mode === 'classic' ? `Lv.${level}` : t('zen')}
        </Text>
        <Text style={[styles.moveText, { color: theme.textSecondary }]}>
          {moveCount} {t('moves')}
        </Text>
      </View>

      <View style={styles.center}>
        <Text style={[styles.coinText, { color: theme.accent }]}>
          🪙 {coins}
        </Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onUndo} style={styles.button}>
          <UndoIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onReset} style={styles.button}>
          <ResetIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onPause} style={styles.button}>
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
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moveText: {
    fontSize: 12,
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
});
