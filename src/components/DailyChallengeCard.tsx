import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useTranslation, TranslationKey } from '../i18n';
import { useProgressStore } from '../store/progressStore';
import { SoundManager } from '../audio/SoundManager';
import { Haptic } from '../utils/haptics';

type Props = { compact?: boolean; onPress?: () => void };

export function DailyChallengeCard({ compact = false, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const daily = useProgressStore((s) => s.daily);
  const streak = useProgressStore((s) => s.dailyStreak);
  const claimDaily = useProgressStore((s) => s.claimDaily);
  if (!daily) return null;
  const desc = t(`daily_${daily.type}` as TranslationKey, { n: daily.goal, m: daily.movesLimit });
  const ratio = Math.max(0, Math.min(1, daily.progress / daily.goal));
  const claimable = daily.completed && !daily.claimed;
  const handleClaim = () => {
    const current = useProgressStore.getState().daily;
    if (!current?.completed || current.claimed) return;
    claimDaily();
    SoundManager.play('coin');
    Haptic.success();
  };

  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.heading}>
          <Text style={[styles.spark, { color: theme.accentInk }]}>✦</Text>
          <Text style={[styles.title, { color: theme.text }]}>{t('daily_challenge')}</Text>
        </View>
        {streak > 0 ? (
          <Text style={[styles.streak, { color: theme.accentInk }]}>
            {t('daily_streak', { n: streak })}
          </Text>
        ) : (
          <Text style={[styles.streak, { color: theme.textSecondary }]}>◈ {daily.reward}</Text>
        )}
      </View>
      <Text style={[styles.desc, { color: theme.textSecondary }]}>{desc}</Text>
      <View style={styles.progressRow}>
        <View
          style={[styles.track, { backgroundColor: theme.surfaceMuted }]}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: daily.goal,
            now: Math.min(daily.progress, daily.goal),
          }}
        >
          <View
            style={[styles.fill, { backgroundColor: theme.accent, width: `${ratio * 100}%` }]}
          />
        </View>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {Math.min(daily.progress, daily.goal)} / {daily.goal}
        </Text>
      </View>
      {compact && claimable && (
        <Text style={[styles.badge, { color: theme.accentInk }]}>{t('claim_reward')} →</Text>
      )}
    </>
  );
  const cardStyle = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  // Keep claim and navigation as separate actions rather than nested touch targets.
  return compact && onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={cardStyle}>
      {content}
      {!compact &&
        (claimable ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.claimBtn,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}
            onPress={handleClaim}
          >
            <Text style={[styles.claimText, { color: theme.accentText }]}>
              {t('claim_reward')} · ◈ {daily.reward}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.status, { color: theme.textSecondary }]}>
            {daily.claimed ? `✓ ${t('claimed_label')}` : t('reward_label')} · ◈ {daily.reward}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 22, padding: 18, borderWidth: 1 },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  spark: { fontSize: 19 },
  title: { fontSize: 14, fontWeight: '700' },
  streak: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 12, lineHeight: 19, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  count: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  claimBtn: {
    marginTop: 14,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimText: { fontWeight: '700', fontSize: 14 },
  status: { marginTop: 12, fontSize: 12, textAlign: 'center' },
  badge: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
