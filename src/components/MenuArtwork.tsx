import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';

const TUBE_COLORS = [
  [3, 0, 4],
  [1, 5, 1],
  [2, 4, 0],
];
const TUBE_TILTS = ['-12deg', '0deg', '12deg'] as const;

/** A small still life, rendered once with native views instead of a second game canvas. */
export function MenuArtwork() {
  const theme = useTheme();
  return (
    <View
      style={styles.scene}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.halo, { backgroundColor: theme.accentSoft }]} />
      <View style={[styles.orbit, { borderColor: theme.border }]} />
      <Text style={[styles.spark, { color: theme.accentInk }]}>✦</Text>
      <View style={styles.tubes}>
        {TUBE_COLORS.map((colors, index) => (
          <View
            key={index}
            style={[
              styles.tubeWrap,
              { transform: [{ rotate: TUBE_TILTS[index] }], marginBottom: index === 1 ? 18 : 0 },
            ]}
          >
            <View
              style={[
                styles.rim,
                { backgroundColor: theme.surface, borderColor: theme.tubeOutline },
              ]}
            />
            <View
              style={[
                styles.tube,
                { backgroundColor: theme.surface, borderColor: theme.tubeOutline },
              ]}
            >
              <View style={styles.air} />
              {colors.map((color, layer) => (
                <View
                  key={layer}
                  style={[styles.layer, { backgroundColor: theme.colors[color] }]}
                />
              ))}
              <View style={styles.shine} />
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.dot, { backgroundColor: theme.colors[0] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { height: 176, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  halo: { position: 'absolute', width: 166, height: 166, borderRadius: 83 },
  orbit: {
    position: 'absolute',
    width: 260,
    height: 112,
    borderRadius: 90,
    borderWidth: 1,
    transform: [{ rotate: '-12deg' }],
  },
  tubes: { flexDirection: 'row', gap: 18, alignItems: 'flex-end' },
  tubeWrap: { width: 40 },
  rim: { height: 8, borderWidth: 1.5, borderRadius: 4, zIndex: 1 },
  tube: {
    height: 112,
    marginHorizontal: 3,
    marginTop: -3,
    borderWidth: 1.5,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    padding: 3,
    paddingTop: 0,
  },
  air: { flex: 1 },
  layer: { height: 25 },
  shine: {
    position: 'absolute',
    left: 7,
    top: 8,
    bottom: 12,
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 3,
  },
  spark: { position: 'absolute', top: 22, right: '16%', fontSize: 25 },
  dot: { position: 'absolute', left: '17%', bottom: 24, width: 9, height: 9, borderRadius: 5 },
});
