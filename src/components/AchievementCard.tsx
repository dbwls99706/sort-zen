import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation, TranslationKey } from '../i18n';
import {
  Achievement,
  AchievementStats,
  achievementProgress,
  isUnlocked,
} from '../core/achievements';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

type Props = {
  achievement: Achievement;
  stats: AchievementStats;
  isNew: boolean;
};

export function AchievementCard({ achievement, stats, isNew }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const unlocked = isUnlocked(achievement, stats);
  const { current, threshold, ratio } = achievementProgress(achievement, stats);

  const name =
    t(`ach_name_${achievement.metric}` as TranslationKey) +
    ' ' +
    ROMAN[achievement.tier];
  const desc = t(`ach_desc_${achievement.metric}` as TranslationKey, {
    n: threshold,
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, opacity: unlocked ? 1 : 0.55 },
        isNew && { borderColor: theme.accent, borderWidth: 2 },
      ]}
    >
      <Text style={styles.icon}>{unlocked ? achievement.icon : '🔒'}</Text>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={1}>
        {desc}
      </Text>

      {unlocked ? (
        <Text style={[styles.reward, { color: theme.accent }]}>
          ✓ 🪙 {achievement.reward}
        </Text>
      ) : (
        <View style={styles.progressArea}>
          <View style={[styles.track, { backgroundColor: theme.background }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.accent, width: `${ratio * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {Math.min(current, threshold)}/{threshold}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 34,
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  desc: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  reward: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressArea: {
    width: '100%',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    marginTop: 4,
  },
});
