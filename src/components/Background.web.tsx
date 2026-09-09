import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from './ThemeProvider';

/** Static native shapes keep the atmosphere without a full-screen GPU animation. */
export function Background({ animated: _animated = false }: { animated?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.background, { backgroundColor: theme.background }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.orb, styles.top, { borderColor: theme.border }]} />
      <View style={[styles.orb, styles.bottom, { borderColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    opacity: 0.55,
  },
  top: { top: -240, right: -180 },
  bottom: { bottom: -280, left: -150, width: 520, height: 520, borderRadius: 260 },
});
