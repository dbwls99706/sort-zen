import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation, TranslationKey } from '../i18n';
import { useProgressStore } from '../store/progressStore';
import { SoundManager } from '../audio/SoundManager';
import { Haptic } from '../utils/haptics';

type Props = {
  compact?: boolean; // 메인 메뉴 배너 모드
  onPress?: () => void;
};

export function DailyChallengeCard({ compact = false, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const daily = useProgressStore((s) => s.daily);
  const streak = useProgressStore((s) => s.dailyStreak);
  const claimDaily = useProgressStore((s) => s.claimDaily);

  if (!daily) return null;

  const desc = t(`daily_${daily.type}` as TranslationKey, {
    n: daily.goal,
    m: daily.movesLimit,
  });
  const ratio = Math.max(0, Math.min(1, daily.progress / daily.goal));
  const claimable = daily.completed && !daily.claimed;

  const handleClaim = () => {
    SoundManager.play('coin');
    Haptic.success();
    claimDaily();
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>
          ⚡ {t('daily_challenge')}
        </Text>
        <Text style={[styles.streak, { color: theme.accent }]}>
          🔥 {t('daily_streak', { n: streak })}
        </Text>
      </View>

      <Text style={[styles.desc, { color: theme.textSecondary }]}>{desc}</Text>

      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: theme.background }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: theme.accent, width: `${ratio * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {Math.min(daily.progress, daily.goal)}/{daily.goal}
        </Text>
      </View>

      {!compact &&
        (claimable ? (
          <Pressable
            style={[styles.claimBtn, { backgroundColor: theme.accent }]}
            onPress={handleClaim}
          >
            <Text style={styles.claimText}>
              {t('claim_reward')} 🪙 {daily.reward}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.status, { color: theme.textSecondary }]}>
            {daily.claimed
              ? `✓ ${t('claimed_label')} 🪙 ${daily.reward}`
              : `${t('reward_label')} 🪙 ${daily.reward}`}
          </Text>
        ))}

      {compact && claimable && (
        <Text style={[styles.badge, { color: theme.accent }]}>● {t('challenge_done')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  streak: {
    fontSize: 13,
    fontWeight: '600',
  },
  desc: {
    fontSize: 14,
    marginTop: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
  claimBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});
