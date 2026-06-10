import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';

type StuckModalProps = {
  visible: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onNewBoard: () => void;
  /** 리워드 광고로 빈 튜브 1개 추가 (T144) — 미전달 시 버튼 숨김 */
  onAddTube?: () => void;
};

/** 합법 수가 없을 때 탈출 경로(튜브 추가/되돌리기/새 보드)를 안내한다 (T142). */
export function StuckModal({
  visible,
  canUndo,
  onUndo,
  onNewBoard,
  onAddTube,
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

          {onAddTube && (
            <Pressable
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={onAddTube}
            >
              <Text style={styles.buttonText}>{t('add_tube')}</Text>
            </Pressable>
          )}

          {canUndo && (
            <Pressable
              style={[
                styles.button,
                onAddTube
                  ? [styles.secondaryButton, { borderColor: theme.accent }]
                  : { backgroundColor: theme.accent },
              ]}
              onPress={onUndo}
            >
              <Text
                style={
                  onAddTube
                    ? [styles.secondaryButtonText, { color: theme.accent }]
                    : styles.buttonText
                }
              >
                {t('undo')}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.button,
              styles.secondaryButton,
              styles.lastButton,
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
  },
  lastButton: {
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
