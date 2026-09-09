import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';

const DEMO_BOARDS = [
  [
    [0, 0, 1, 1],
    [1, 1],
    [0, 0],
  ],
  [
    [0, 0],
    [1, 1, 1, 1],
    [0, 0],
  ],
  [[0, 0, 0, 0], [1, 1, 1, 1], []],
];

/** Show a legal matching-color pour, then the finished board, without an idle render loop. */
export function OnboardingIllustration({ step = 0 }: { step?: number }) {
  const theme = useTheme();
  const board = DEMO_BOARDS[Math.min(step, DEMO_BOARDS.length - 1)];
  return (
    <View
      style={styles.scene}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.backdrop, { backgroundColor: theme.accentSoft }]} />
      <View style={styles.tubes}>
        {board.map((tube, index) => {
          const full = tube.length === 4 && tube.every((color) => color === tube[0]);
          const selected = step === 0 && index === 0;
          return (
            <View key={index} style={[styles.tubeColumn, selected && styles.selected]}>
              <Text
                style={[
                  styles.marker,
                  { color: selected ? theme.accentInk : full ? theme.success : 'transparent' },
                ]}
              >
                {full ? '✓' : '↓'}
              </Text>
              <View
                style={[
                  styles.rim,
                  {
                    borderColor: selected ? theme.accentInk : theme.tubeOutline,
                    backgroundColor: theme.surface,
                  },
                ]}
              />
              <View
                style={[
                  styles.tube,
                  {
                    borderColor: selected ? theme.accentInk : theme.tubeOutline,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                {tube
                  .slice()
                  .reverse()
                  .map((color, layer) => (
                    <View
                      key={layer}
                      style={[styles.liquid, { backgroundColor: theme.colors[color] }]}
                    />
                  ))}
                <View style={styles.shine} />
              </View>
            </View>
          );
        })}
      </View>
      {step === 0 && <Text style={[styles.arrow, { color: theme.accentInk }]}>→</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: 260,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backdrop: { position: 'absolute', width: 208, height: 208, borderRadius: 104 },
  tubes: { flexDirection: 'row', alignItems: 'flex-end', gap: 24 },
  tubeColumn: { width: 44 },
  selected: { transform: [{ translateY: -10 }] },
  marker: { fontSize: 22, height: 32, fontWeight: '700', textAlign: 'center' },
  rim: { height: 8, borderWidth: 1.5, borderRadius: 4, zIndex: 1 },
  tube: {
    height: 132,
    marginTop: -3,
    marginHorizontal: 3,
    padding: 3,
    paddingTop: 0,
    borderWidth: 1.5,
    borderBottomLeftRadius: 21,
    borderBottomRightRadius: 21,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquid: { height: 28 },
  shine: {
    position: 'absolute',
    width: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
    left: 7,
    top: 12,
    bottom: 12,
  },
  arrow: { position: 'absolute', fontSize: 28, top: 20, left: 87 },
});
