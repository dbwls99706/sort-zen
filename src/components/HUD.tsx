import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { HintIcon, PauseIcon, ResetIcon, UndoIcon } from './icons';
import { HINT_COST } from '../core/constants';

type ToolbarProps = {
  onHint: () => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo?: boolean;
  disabled?: boolean;
};
type HUDProps = ToolbarProps & {
  level: number;
  coins: number;
  mode: 'classic' | 'zen';
  moveCount: number;
  onPause: () => void;
  toolbar?: boolean;
};

/** Status stays at the top; labeled tools can live in the thumb zone below the board. */
export function HUD({
  level,
  coins,
  mode,
  moveCount,
  onPause,
  toolbar = true,
  ...tools
}: HUDProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pause')}
          onPress={onPause}
          style={({ pressed }) => [
            styles.pause,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <PauseIcon color={theme.text} size={21} />
        </Pressable>
        <View
          style={styles.levelBlock}
          accessible
          accessibilityLabel={`${mode === 'classic' ? `${t('level')} ${level}` : t('zen')}, ${moveCount} ${t('moves')}`}
        >
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
            {mode === 'classic' ? t('classic') : t('endless_relax')}
          </Text>
          <Text style={[styles.level, { color: theme.text }]}>
            {mode === 'classic' ? `${t('level')} ${level}` : t('zen')}
          </Text>
        </View>
        <View
          style={[styles.coins, { backgroundColor: theme.surface, borderColor: theme.border }]}
          accessible
          accessibilityLabel={`${t('coins')}: ${coins}`}
        >
          <Text style={[styles.coinMark, { color: theme.accentInk }]}>◈</Text>
          <Text style={[styles.coinValue, { color: theme.text }]}>{coins}</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={[styles.moves, { color: theme.textSecondary }]}>
          {moveCount} {t('moves')}
        </Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      {toolbar && <GameToolbar {...tools} />}
    </View>
  );
}

export function GameToolbar({
  onHint,
  onUndo,
  onReset,
  canUndo = true,
  disabled = false,
}: ToolbarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const actions = [
    { key: 'undo' as const, onPress: onUndo, Icon: UndoIcon, unavailable: disabled || !canUndo },
    { key: 'hint' as const, onPress: onHint, Icon: HintIcon, unavailable: disabled },
    { key: 'reset' as const, onPress: onReset, Icon: ResetIcon, unavailable: disabled },
  ];
  return (
    <View style={styles.toolbar}>
      {actions.map(({ key, onPress, Icon, unavailable }) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={key === 'hint' ? `${t('hint')}, ${HINT_COST} ${t('coins')}` : t(key)}
          accessibilityState={{ disabled: unavailable }}
          disabled={unavailable}
          onPress={onPress}
          style={({ pressed }) => [
            styles.tool,
            {
              backgroundColor: key === 'hint' ? theme.accentSoft : theme.surface,
              borderColor: key === 'hint' ? theme.accentSoft : theme.border,
            },
            unavailable && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Icon color={theme.text} size={22} />
          <Text style={[styles.toolLabel, { color: theme.text }]}>
            {t(key)}
            {key === 'hint' && (
              <Text style={[styles.toolPrice, { color: theme.accentInk }]}> · {HINT_COST}</Text>
            )}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pause: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBlock: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, marginBottom: 2 },
  level: { fontSize: 23, fontWeight: '700', letterSpacing: -0.6 },
  coins: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minHeight: 38,
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    maxWidth: '35%',
  },
  coinMark: { fontSize: 18 },
  coinValue: { fontSize: 13, fontWeight: '700', flexShrink: 1, fontVariant: ['tabular-nums'] },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 4,
  },
  line: { height: 1, flex: 1, maxWidth: 72 },
  moves: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
  },
  tool: {
    flex: 1,
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  toolLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  toolPrice: { fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.6 },
});
