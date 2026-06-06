import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/components/ThemeProvider';
import { useProgressStore } from '../src/store/progressStore';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { useTranslation } from '../src/i18n';
import { ACHIEVEMENTS } from '../src/core/achievements';
import { AchievementCard } from '../src/components/AchievementCard';
import { DailyChallengeCard } from '../src/components/DailyChallengeCard';

export default function AchievementsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const ensureDaily = useProgressStore((s) => s.ensureDaily);
  const syncAchievements = useProgressStore((s) => s.syncAchievements);
  const clearRecentUnlocks = useProgressStore((s) => s.clearRecentUnlocks);
  const recentUnlocks = useProgressStore((s) => s.recentUnlocks);
  const getStats = useProgressStore((s) => s.getStats);

  // 화면 진입 시 데일리 갱신 + 붓기 기반 도전과제 반영
  useEffect(() => {
    ensureDaily();
    syncAchievements();
  }, [ensureDaily, syncAchievements]);

  const stats = getStats();
  const newSet = new Set(recentUnlocks);

  const handleBack = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    clearRecentUnlocks();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Text style={[styles.backText, { color: theme.accent }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t('achievements')}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {recentUnlocks.length > 0 && (
          <View style={[styles.newBanner, { backgroundColor: theme.accent }]}>
            <Text style={styles.newBannerText}>
              🎉 {t('new_unlock')} +{recentUnlocks.length}
            </Text>
          </View>
        )}

        <DailyChallengeCard />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('collection')}
        </Text>

        <View style={styles.grid}>
          {ACHIEVEMENTS.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              stats={stats}
              isNew={newSet.has(a.id)}
            />
          ))}
        </View>
      </ScrollView>

      <AdBanner />
    </SafeAreaView>
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
  scroll: {
    paddingBottom: 16,
    gap: 16,
  },
  newBanner: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  newBannerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
});
