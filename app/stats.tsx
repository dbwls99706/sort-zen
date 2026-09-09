import { ScreenLayout } from '../src/components/ScreenLayout';
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { useTheme } from '../src/components/ThemeProvider';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
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
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScreenLayout title={t('stats')} onBack={handleBack}>
      <View style={styles.grid}>
        <StatCard label={t('level')} value={`⭐ ${level}`} theme={theme} />
        <StatCard label={t('cleared')} value={`🏆 ${totalCleared}`} theme={theme} />
        <StatCard label={t('play_time')} value={`⏱️ ${formatTime(totalPlayTime)}`} theme={theme} />
        <StatCard label={t('coins')} value={`🪙 ${coins}`} theme={theme} />
      </View>
    </ScreenLayout>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
};

function StatCard({ label, value, theme }: StatCardProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, minWidth: 130 * Math.min(fontScale, 2) },
      ]}
    >
      <Text style={[styles.cardValue, { color: theme.accentInk }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
});
