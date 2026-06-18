import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { UndoIcon, ResetIcon, PauseIcon, HintIcon } from './icons';

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

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* 좌측: 레벨/이동 + 코인. 우측 버튼군과 분리해 겹침을 원천 차단한다. */}
      <View style={styles.left}>
        <View style={styles.levelBlock}>
          <Text
            style={[styles.levelText, { color: theme.text }]}
            numberOfLines={1}
          >
            {mode === 'classic' ? `Lv.${level}` : t('zen')}
          </Text>
          <Text style={[styles.moveText, { color: theme.textSecondary }]}>
            {moveCount} {t('moves')}
          </Text>
        </View>
        <Text
          style={[styles.coinText, { color: theme.accent }]}
          numberOfLines={1}
        >
          🪙 {coins}
        </Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onHint} style={styles.button} hitSlop={6}>
          <HintIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onUndo} style={styles.button} hitSlop={6}>
          <UndoIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onReset} style={styles.button} hitSlop={6}>
          <ResetIcon color={theme.text} />
        </Pressable>
        <Pressable onPress={onPause} style={styles.button} hitSlop={6}>
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
