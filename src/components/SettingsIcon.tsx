import React from 'react';
import { View } from 'react-native';

/** A quiet, font-independent sliders icon; the surrounding button owns the touch target. */
export function SettingsIcon({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 22, height: 24, justifyContent: 'space-around' }}
    >
      {[13, 5, 13].map((left, index) => (
        <View key={index} style={{ height: 2, backgroundColor: color, borderRadius: 1 }}>
          <View
            style={{
              position: 'absolute',
              left,
              top: -2,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        </View>
      ))}
    </View>
  );
}
