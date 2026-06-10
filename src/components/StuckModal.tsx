import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';

type StuckModalProps = {
  visible: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onNewBoard: () => void;
};

/** 합법 수가 없을 때 탈출 경로(되돌리기/새 보드)를 안내한다 (T142). */
export function StuckModal({
  visible,
  canUndo,
  onUndo,
  onNewBoard,
}: StuckModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('stuck_title')}
          </Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>
            {t('stuck_desc')}
          </Text>

          {canUndo && (
            <Pressable
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={onUndo}
            >
              <Text style={styles.buttonText}>{t('undo')}</Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.button,
              styles.secondaryButton,
              { borderColor: theme.accent },
            ]}
            onPress={onNewBoard}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
              {t('new_board')}
            </Text>
          </Pressable>
        </View>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    marginBottom: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
