import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/components/ThemeProvider';
import { useUserStore } from '../src/store/userStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { Onboarding } from '../src/components/Onboarding';
import { Background } from '../src/components/Background';
import { useTranslation } from '../src/i18n';

export default function MainMenu() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const level = useUserStore((s) => s.level);
  const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  if (!hasSeenOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const handlePress = (path: string) => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.push(path as never);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Background />
      <View style={styles.titleArea}>
        <Text style={[styles.title, { color: theme.text }]}>{t('app_name')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('subtitle')}
        </Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.mainButton, { backgroundColor: theme.accent }]}
          onPress={() => handlePress('/game/classic')}
        >
          <Text style={styles.mainButtonText}>{t('classic')}</Text>
          <Text style={styles.mainButtonSub}>{t('level')} {level}</Text>
        </Pressable>

        <Pressable
          style={[styles.mainButton, { backgroundColor: '#88C999' }]}
          onPress={() => handlePress('/game/zen')}
        >
          <Text style={styles.mainButtonText}>{t('zen')}</Text>
          <Text style={styles.mainButtonSub}>{t('endless_relax')}</Text>
        </Pressable>
      </View>

      <View style={styles.bottomButtons}>
        <Pressable
          style={[styles.smallButton, { backgroundColor: theme.surface }]}
          onPress={() => handlePress('/settings')}
        >
          <Text style={[styles.smallButtonText, { color: theme.text }]}>
            {t('settings')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.smallButton, { backgroundColor: theme.surface }]}
          onPress={() => handlePress('/shop')}
        >
          <Text style={[styles.smallButtonText, { color: theme.text }]}>
            {t('shop')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.smallButton, { backgroundColor: theme.surface }]}
          onPress={() => handlePress('/stats')}
        >
          <Text style={[styles.smallButtonText, { color: theme.text }]}>
            {t('stats')}
          </Text>
        </Pressable>
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  buttons: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  mainButton: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  mainButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mainButtonSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
