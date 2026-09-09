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
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={{ color: theme.textSecondary }}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.bars}>
        {Array.from({ length: STEPS }, (_, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${i === 0 && active === 1 ? 0 : (i + 1) * 20}%`}
            accessibilityState={{ selected: active === i + 1 }}
            // 이미 최저 단계에서 첫 막대를 다시 누르면 음소거(0)
            onPress={() => onChange(i === 0 && active === 1 ? 0 : (i + 1) / STEPS)}
            style={styles.target}
          >
            <View
              style={[
                styles.bar,
                {
                  height: 12 + i * 5,
                  backgroundColor: i < active ? theme.accent : theme.tubeBackground,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: 16,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  target: {
    minWidth: 44,
    height: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  bar: {
    width: 13,
    borderRadius: 3,
  },
});
