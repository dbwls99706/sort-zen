import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.stars]}>★★★</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'classic' ? `Level ${level}` : 'ZEN'} Clear!
          </Text>
          <Text style={[styles.moves, { color: theme.textSecondary }]}>
            {moveCount} moves
          </Text>

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onNextLevel}
          >
            <Text style={styles.buttonText}>
              {mode === 'classic' ? 'Next Level' : 'New Puzzle'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.menuButton]}
            onPress={onMenu}
          >
            <Text style={[styles.menuButtonText, { color: theme.textSecondary }]}>
              Menu
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
  stars: {
    fontSize: 40,
    color: '#FFD700',
    marginBottom: 12,
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
