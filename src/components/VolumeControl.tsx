import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

const STEPS = 5;

type VolumeControlProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

/** 의존성 없는 세그먼트형 볼륨 컨트롤 (탭으로 단계 선택) */
export function VolumeControl({ label, value, onChange }: VolumeControlProps) {
  const theme = useTheme();
  const active = Math.round(value * STEPS);

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.bars}>
        {Array.from({ length: STEPS }, (_, i) => (
          <Pressable
            key={i}
            hitSlop={6}
            // 이미 최저 단계에서 첫 막대를 다시 누르면 음소거(0)
            onPress={() => onChange(i === 0 && active === 1 ? 0 : (i + 1) / STEPS)}
            style={[
              styles.bar,
              {
                height: 12 + i * 5,
                backgroundColor: i < active ? theme.accent : theme.tubeBackground,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: 16,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  bar: {
    width: 13,
    borderRadius: 3,
  },
});
