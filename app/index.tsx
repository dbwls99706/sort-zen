import { useCallback, useRef } from 'react';
import { View, Text, Pressable, Alert, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/components/ThemeProvider';
import { useUserStore } from '../src/store/userStore';
import { useGameStore } from '../src/store/gameStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useProgressStore } from '../src/store/progressStore';
import { SoundManager } from '../src/audio/SoundManager';
import { GameServicesManager } from '../src/services/GameServicesManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { Onboarding } from '../src/components/Onboarding';
import { Background } from '../src/components/Background';
import { DailyChallengeCard } from '../src/components/DailyChallengeCard';
import { MenuArtwork } from '../src/components/MenuArtwork';
import { useTranslation } from '../src/i18n';

export default function MainMenu() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const level = useUserStore((s) => s.level);
  const coins = useUserStore((s) => s.coins);
  const canContinue = useGameStore((s) => s.mode === 'classic' && s.tubes.length > 0 && !s.cleared);
  const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const recentUnlocks = useProgressStore((s) => s.recentUnlocks);
  const daily = useProgressStore((s) => s.daily);
  const navigating = useRef(false);
  const leaderboardPending = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      useProgressStore.getState().ensureDaily();
      useProgressStore.getState().syncAchievements();
    }, []),
  );

  const hasBadge = recentUnlocks.length > 0 || (daily?.completed === true && !daily.claimed);
  if (!hasSeenOnboarding) return <Onboarding onComplete={completeOnboarding} />;

  const handlePress = (path: string) => {
    if (navigating.current) return;
    navigating.current = true;
    SoundManager.play('button_tap');
    Haptic.light();
    router.push(path as never);
  };

  const handleLeaderboard = async () => {
    if (leaderboardPending.current) return;
    leaderboardPending.current = true;
    SoundManager.play('button_tap');
    Haptic.light();
    try {
      if (!GameServicesManager.isAvailable()) {
        Alert.alert(t('leaderboard'), t('leaderboard_android_only'));
        return;
      }
      if (!useUserStore.getState().googleSignedIn && !(await GameServicesManager.signIn())) {
        Alert.alert(t('leaderboard'), t('sign_in_failed'));
        return;
      }
      if (!navigating.current) await GameServicesManager.showLeaderboard();
    } finally {
      leaderboardPending.current = false;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Background />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
                <View style={styles.brandCut} />
              </View>
              <Text style={[styles.brandName, { color: theme.text }]}>{t('app_name')}</Text>
            </View>
            <View
              style={[styles.coins, { backgroundColor: theme.surface, borderColor: theme.border }]}
              accessible
              accessibilityLabel={`${t('coins')}: ${coins}`}
            >
              <Text style={[styles.coinMark, { color: theme.accentInk }]}>◈</Text>
              <Text style={[styles.coinValue, { color: theme.text }]}>{coins}</Text>
            </View>
          </View>

          <View style={[styles.hero, { backgroundColor: theme.hero, borderColor: theme.border }]}>
            <Text style={[styles.eyebrow, { color: theme.accentInk }]}>{t('home_eyebrow')}</Text>
            <Text style={[styles.headline, { color: theme.text }]}>{t('home_headline')}</Text>
            <MenuArtwork />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('classic')}, ${t('level')} ${level}`}
              onPress={() => handlePress('/game/classic')}
              style={({ pressed }) => [
                styles.playButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.playCopy}>
                <Text style={[styles.playLabel, { color: theme.accentText }]}>
                  {t(canContinue ? 'home_play' : 'home_start')}
                </Text>
                <Text style={[styles.playDetail, { color: theme.accentText }]}>
                  {t('classic')} · {t('level')} {level}
                </Text>
              </View>
              <View style={styles.playArrow}>
                <Text style={[styles.arrow, { color: theme.accentText }]}>→</Text>
              </View>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('home_explore')}
          </Text>
          <View style={styles.modes}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handlePress('/game/zen')}
              style={({ pressed }) => [
                styles.modeCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.modeSymbol, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.infinity, { color: theme.accentInk }]}>∞</Text>
              </View>
              <Text style={[styles.modeTitle, { color: theme.text }]}>{t('zen')}</Text>
              <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                {t('home_zen_desc')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => handlePress('/game/slime')}
              style={({ pressed }) => [
                styles.modeCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.modeSymbol, { backgroundColor: theme.surfaceMuted }]}>
                <View style={styles.soundBars}>
                  {[12, 22, 30, 18, 10].map((height, index) => (
                    <View
                      key={index}
                      style={[styles.soundBar, { height, backgroundColor: theme.colors[4] }]}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.modeTitle, { color: theme.text }]}>{t('home_asmr_short')}</Text>
              <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                {t('home_asmr_desc')}
              </Text>
            </Pressable>
          </View>

          <DailyChallengeCard compact onPress={() => handlePress('/achievements')} />
          <View style={[styles.navigation, { borderColor: theme.border }]}>
            {(['shop', 'stats', 'achievements', 'settings'] as const).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => handlePress(`/${key}`)}
                style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
              >
                <View style={styles.navLabelWrap}>
                  <Text style={[styles.navLabel, { color: theme.text }]}>{t(key)}</Text>
                  {key === 'achievements' && hasBadge && (
                    <View style={[styles.badge, { backgroundColor: theme.accent }]} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
          {GameServicesManager.isAvailable() && (
            <Pressable
              accessibilityRole="button"
              onPress={handleLeaderboard}
              style={styles.leaderboard}
            >
              <Text style={[styles.navLabel, { color: theme.textSecondary }]}>
                {t('leaderboard')} ↗
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  content: { width: '100%', maxWidth: 520 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: {
    width: 22,
    height: 28,
    borderRadius: 7,
    transform: [{ rotate: '-12deg' }],
    overflow: 'hidden',
    justifyContent: 'center',
  },
  brandCut: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
    transform: [{ rotate: '-15deg' }],
  },
  brandName: { fontSize: 21, fontWeight: '800', letterSpacing: -0.7 },
  coins: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  coinMark: { fontSize: 19 },
  coinValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hero: { borderRadius: 28, borderWidth: 1, padding: 22, paddingBottom: 18, overflow: 'hidden' },
  eyebrow: { fontSize: 10, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5 },
  headline: { fontSize: 28, lineHeight: 38, fontWeight: '700', letterSpacing: -1, marginTop: 8 },
  playButton: {
    minHeight: 70,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  playCopy: { flex: 1 },
  playLabel: { fontSize: 18, fontWeight: '700' },
  playDetail: { fontSize: 12, marginTop: 4, opacity: 0.85 },
  playArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 24, lineHeight: 30 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  modeCard: { flex: 1, minWidth: 130, borderRadius: 22, padding: 16, borderWidth: 1 },
  modeSymbol: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infinity: { fontSize: 38, lineHeight: 42, fontWeight: '400' },
  modeTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.4 },
  modeDescription: { fontSize: 12, lineHeight: 19, marginTop: 5 },
  soundBars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  soundBar: { width: 4, borderRadius: 3 },
  navigation: {
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    paddingTop: 8,
    gap: 8,
  },
  navButton: {
    flex: 1,
    minHeight: 48,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navLabelWrap: { alignItems: 'center' },
  navLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  badge: { width: 5, height: 5, borderRadius: 3, position: 'absolute', right: -7, top: -2 },
  leaderboard: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
