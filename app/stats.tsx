import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../src/store/userStore';
import { useTheme } from '../src/components/ThemeProvider';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { useTranslation } from '../src/i18n';

export default function StatsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { level, totalCleared, totalPlayTime, coins } = useUserStore();

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

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
        <Text style={[styles.title, { color: theme.text }]}>{t('stats')}</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.grid}>
        <StatCard
          label={t('level')}
          value={String(level)}
          theme={theme}
        />
        <StatCard
          label={t('cleared')}
          value={String(totalCleared)}
          theme={theme}
        />
        <StatCard
          label={t('play_time')}
          value={formatTime(totalPlayTime)}
          theme={theme}
        />
        <StatCard
          label={t('coins')}
          value={String(coins)}
          theme={theme}
        />
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
};

function StatCard({ label, value, theme }: StatCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={[styles.cardValue, { color: theme.accent }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 32,
  },
  card: {
    width: '46%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
  },
});
