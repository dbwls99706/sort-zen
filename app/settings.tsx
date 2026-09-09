import { ScreenLayout } from '../src/components/ScreenLayout';
import React from 'react';
import { View, Text, Switch, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/settingsStore';
import { useUserStore } from '../src/store/userStore';
import { useTheme } from '../src/components/ThemeProvider';
import { SoundManager } from '../src/audio/SoundManager';
import { GameServicesManager } from '../src/services/GameServicesManager';
import { Haptic } from '../src/utils/haptics';
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
  const googleSignedIn = useUserStore((s) => s.googleSignedIn);
  const googlePlayerName = useUserStore((s) => s.googlePlayerName);

  const isThemeLocked = (thm: Theme): boolean => (thm === 'neon' || thm === 'dark') && !isPremium;

  const handleBack = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleSignIn = async () => {
    Haptic.light();
    const ok = await GameServicesManager.signIn();
    if (!ok) Alert.alert(t('account'), t('sign_in_failed'));
  };

  const handleSignOut = () => {
    Haptic.light();
    GameServicesManager.signOut();
  };

  return (
    <ScreenLayout title={t('settings')} onBack={handleBack}>
      <View style={styles.section}>
        <SettingRow label={t('sound')} value={soundEnabled} onToggle={toggleSound} theme={theme} />
        <SettingRow label={t('bgm')} value={bgmEnabled} onToggle={toggleBgm} theme={theme} />
        <SettingRow
          label={t('haptic')}
          value={hapticEnabled}
          onToggle={toggleHaptic}
          theme={theme}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('volume')}</Text>
      <View>
        <VolumeControl
          label={t('vol_master')}
          value={masterVolume}
          onChange={(v) => {
            setMasterVolume(v);
            Haptic.light();
            SoundManager.refreshBgmVolume();
            SoundManager.refreshSfxVolume().then(() => SoundManager.play('button_tap'));
          }}
        />
        <VolumeControl
          label={t('vol_sfx')}
          value={sfxVolume}
          onChange={(v) => {
            setSfxVolume(v);
            Haptic.light();
            SoundManager.refreshSfxVolume().then(() => SoundManager.play('button_tap'));
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

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('theme')}</Text>
      <View style={styles.themeRow}>
        {THEMES.map((thm) => {
          const locked = isThemeLocked(thm);
          return (
            <Pressable
              key={thm}
              accessibilityRole="button"
              accessibilityState={{ selected: currentTheme === thm }}
              style={[
                styles.themeButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: currentTheme === thm ? theme.accentInk : 'transparent',
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
                {t(thm)}
                {locked ? ' 🔒' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('language')}</Text>
      <View style={styles.themeRow}>
        {LANGUAGES.map((lng) => (
          <Pressable
            key={lng}
            accessibilityRole="button"
            accessibilityState={{ selected: language === lng }}
            style={[
              styles.themeButton,
              {
                backgroundColor: theme.surface,
                borderColor: language === lng ? theme.accentInk : 'transparent',
              },
            ]}
            onPress={() => {
              setLanguage(lng);
              Haptic.light();
            }}
          >
            <Text style={[styles.themeText, { color: theme.text }]}>{LANGUAGE_LABELS[lng]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('account')}</Text>
      {GameServicesManager.isAvailable() ? (
        googleSignedIn ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              {t('signed_in_as', { name: googlePlayerName ?? t('player') })}
            </Text>
            <Pressable
              onPress={handleSignOut}
              accessibilityRole="button"
              style={styles.accountButton}
            >
              <Text style={[styles.accountAction, { color: theme.accentInk }]}>
                {t('sign_out')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={[
              styles.signInButton,
              { backgroundColor: theme.surface, borderColor: theme.accentInk },
            ]}
            onPress={handleSignIn}
          >
            <Text style={[styles.signInText, { color: theme.accentInk }]}>
              {t('sign_in_google')}
            </Text>
          </Pressable>
        )
      ) : (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t('leaderboard_android_only')}
        </Text>
      )}
    </ScreenLayout>
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
      <Switch value={value} onValueChange={onToggle} accessibilityLabel={label} hitSlop={10} />
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: 16,
    flexShrink: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  accountAction: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  accountButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  signInButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
