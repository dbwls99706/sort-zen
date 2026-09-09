import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';
import { useTheme } from './ThemeProvider';
import { Background } from './Background';
import { OnboardingIllustration } from './OnboardingIllustration';
import { Haptic } from '../utils/haptics';

const SLIDE_KEYS = [
  { title: 'onboarding_1_title', desc: 'onboarding_1_desc' },
  { title: 'onboarding_2_title', desc: 'onboarding_2_desc' },
  { title: 'onboarding_3_title', desc: 'onboarding_3_desc' },
] as const;

type OnboardingProps = { onComplete: () => void };

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const { t } = useTranslation();
  const theme = useTheme();
  const handleNext = () => {
    Haptic.light();
    if (page < SLIDE_KEYS.length - 1)
      setPage((current) => Math.min(current + 1, SLIDE_KEYS.length - 1));
    else onComplete();
  };
  const slide = SLIDE_KEYS[page];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Background />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.brand, { color: theme.text }]}>{t('app_name')}</Text>
          <View style={styles.lesson}>
            <OnboardingIllustration step={page} />
            <View
              style={styles.dots}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: SLIDE_KEYS.length, now: page + 1 }}
            >
              {SLIDE_KEYS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === page ? theme.accent : theme.border },
                    index === page && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              style={[styles.title, { color: theme.text }]}
            >
              {t(slide.title)}
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {t(slide.desc)}
            </Text>
          </View>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={handleNext}
            >
              <Text style={[styles.buttonText, { color: theme.accentText }]}>
                {page < SLIDE_KEYS.length - 1 ? t('next') : t('lets_go')}
              </Text>
              <Text style={[styles.arrow, { color: theme.accentText }]}>→</Text>
            </Pressable>
            {page < SLIDE_KEYS.length - 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={onComplete}
                style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
              >
                <Text style={[styles.skipText, { color: theme.textSecondary }]}>{t('skip')}</Text>
              </Pressable>
            ) : (
              <View style={styles.skipButton} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 24, alignItems: 'center' },
  content: { flexGrow: 1, width: '100%', maxWidth: 420 },
  brand: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  lesson: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: { fontSize: 15, textAlign: 'center', lineHeight: 25 },
  footer: { width: '100%' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 28 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 22 },
  button: {
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 20,
    gap: 12,
  },
  buttonText: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  arrow: { fontSize: 24 },
  skipButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
