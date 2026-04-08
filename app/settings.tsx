import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTheme } from '../src/components/ThemeProvider';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';

type Theme = 'pastel' | 'neon' | 'dark';
const THEMES: Theme[] = ['pastel', 'neon', 'dark'];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    soundEnabled,
    bgmEnabled,
    hapticEnabled,
    theme: currentTheme,
    toggleSound,
    toggleBgm,
    toggleHaptic,
    setTheme,
  } = useSettingsStore();

  const handleBack = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Text style={[styles.backText, { color: theme.accent }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.section}>
        <SettingRow
          label="Sound"
          value={soundEnabled}
          onToggle={toggleSound}
          theme={theme}
        />
        <SettingRow
          label="BGM"
          value={bgmEnabled}
          onToggle={toggleBgm}
          theme={theme}
        />
        <SettingRow
          label="Haptic"
          value={hapticEnabled}
          onToggle={toggleHaptic}
          theme={theme}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Theme
      </Text>
      <View style={styles.themeRow}>
        {THEMES.map((t) => (
          <Pressable
            key={t}
            style={[
              styles.themeButton,
              {
                backgroundColor: theme.surface,
                borderColor:
                  currentTheme === t ? theme.accent : 'transparent',
              },
            ]}
            onPress={() => {
              setTheme(t);
              Haptic.light();
            }}
          >
            <Text style={[styles.themeText, { color: theme.text }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}

type SettingRowProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
};

function SettingRow({ label, value, onToggle, theme }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  spacer: {
    width: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 32,
    marginBottom: 12,
  },
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
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
