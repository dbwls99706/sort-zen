import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

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

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.left}>
        <Text style={[styles.levelText, { color: theme.text }]}>
          {mode === 'classic' ? `Lv.${level}` : 'ZEN'}
        </Text>
        <Text style={[styles.moveText, { color: theme.textSecondary }]}>
          {moveCount} moves
        </Text>
      </View>

      <View style={styles.center}>
        <Text style={[styles.coinText, { color: theme.accent }]}>
          {coins}
        </Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onUndo} style={styles.button}>
          <Text style={[styles.buttonText, { color: theme.text }]}>↩</Text>
        </Pressable>
        <Pressable onPress={onReset} style={styles.button}>
          <Text style={[styles.buttonText, { color: theme.text }]}>↻</Text>
        </Pressable>
        <Pressable onPress={onPause} style={styles.button}>
          <Text style={[styles.buttonText, { color: theme.text }]}>⏸</Text>
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
  buttonText: {
    fontSize: 18,
  },
});
