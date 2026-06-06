import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/store/settingsStore';
import { useUserStore } from '../src/store/userStore';
import { useTheme } from '../src/components/ThemeProvider';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { VolumeControl } from '../src/components/VolumeControl';
import { useTranslation } from '../src/i18n';

type Theme = 'pastel' | 'neon' | 'dark';
const THEMES: Theme[] = ['pastel', 'neon', 'dark'];

type Language = 'ko' | 'en';
const LANGUAGES: Language[] = ['ko', 'en'];
const LANGUAGE_LABELS: Record<Language, string> = { ko: '한국어', en: 'English' };

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    soundEnabled,
    bgmEnabled,
    hapticEnabled,
    masterVolume,
    sfxVolume,
    bgmVolume,
    theme: currentTheme,
    language,
    toggleSound,
    toggleBgm,
    toggleHaptic,
    setMasterVolume,
    setSfxVolume,
    setBgmVolume,
    setTheme,
    setLanguage,
  } = useSettingsStore();
  const isPremium = useUserStore((s) => s.isPremium);

  const isThemeLocked = (thm: Theme): boolean =>
    (thm === 'neon' || thm === 'dark') && !isPremium;

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
        <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.section}>
        <SettingRow
          label={t('sound')}
          value={soundEnabled}
          onToggle={toggleSound}
          theme={theme}
        />
        <SettingRow
          label={t('bgm')}
          value={bgmEnabled}
          onToggle={toggleBgm}
          theme={theme}
        />
        <SettingRow
          label={t('haptic')}
          value={hapticEnabled}
          onToggle={toggleHaptic}
          theme={theme}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {t('volume')}
      </Text>
      <View>
        <VolumeControl
          label={t('vol_master')}
          value={masterVolume}
          onChange={(v) => {
            setMasterVolume(v);
            Haptic.light();
            SoundManager.refreshBgmVolume();
          }}
        />
        <VolumeControl
          label={t('vol_sfx')}
          value={sfxVolume}
          onChange={(v) => {
            setSfxVolume(v);
            Haptic.light();
            SoundManager.play('button_tap');
          }}
        />
        <VolumeControl
          label={t('vol_bgm')}
          value={bgmVolume}
          onChange={(v) => {
            setBgmVolume(v);
            Haptic.light();
            SoundManager.refreshBgmVolume();
          }}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {t('theme')}
      </Text>
      <View style={styles.themeRow}>
        {THEMES.map((thm) => {
          const locked = isThemeLocked(thm);
          return (
            <Pressable
              key={thm}
              style={[
                styles.themeButton,
                {
                  backgroundColor: theme.surface,
                  borderColor:
                    currentTheme === thm ? theme.accent : 'transparent',
                  opacity: locked ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (locked) {
                  router.push('/shop');
                  return;
                }
                setTheme(thm);
                Haptic.light();
              }}
            >
              <Text style={[styles.themeText, { color: theme.text }]}>
                {t(thm)}{locked ? ' 🔒' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {t('language')}
      </Text>
      <View style={styles.themeRow}>
        {LANGUAGES.map((lng) => (
          <Pressable
            key={lng}
            style={[
              styles.themeButton,
              {
                backgroundColor: theme.surface,
                borderColor:
                  language === lng ? theme.accent : 'transparent',
              },
            ]}
            onPress={() => {
              setLanguage(lng);
              Haptic.light();
            }}
          >
            <Text style={[styles.themeText, { color: theme.text }]}>
              {LANGUAGE_LABELS[lng]}
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
