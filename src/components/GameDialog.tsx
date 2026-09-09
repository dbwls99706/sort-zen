import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { HINT_COST } from '../core/constants';

type Props = {
  kind: 'pause' | 'reset' | 'hint' | null;
  onResume: () => void;
  onReset: () => void;
  onMenu: () => void;
  onRewardHint: () => void;
};

export function GameDialog({ kind, onResume, onReset, onMenu, onRewardHint }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onResume}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
          <View style={[styles.card, { backgroundColor: theme.surface }]} accessibilityViewIsModal>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              {t(
                kind === 'hint'
                  ? 'hint_watch_ad'
                  : kind === 'reset'
                    ? 'reset_confirm_title'
                    : 'pause_title',
              )}
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {t(
                kind === 'hint'
                  ? 'hint_ad_desc'
                  : kind === 'reset'
                    ? 'reset_confirm_desc'
                    : 'pause_desc',
                { n: HINT_COST },
              )}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={kind === 'hint' ? onRewardHint : onResume}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.label, { color: theme.accentText }]}>
                {t(kind === 'hint' ? 'watch_ad' : 'resume')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={kind === 'hint' ? onResume : onReset}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.label, { color: theme.text }]}>
                {t(kind === 'hint' ? 'cancel' : 'reset')}
              </Text>
            </Pressable>
            {kind === 'pause' && (
              <Pressable accessibilityRole="button" onPress={onMenu} style={styles.button}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('menu')}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,32,29,0.55)' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 28, padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  description: { fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 12 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  label: { fontSize: 16, fontWeight: '700' },
});
