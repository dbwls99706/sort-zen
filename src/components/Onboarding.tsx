import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDE_KEYS = [
  { title: 'onboarding_1_title', desc: 'onboarding_1_desc' },
  { title: 'onboarding_2_title', desc: 'onboarding_2_desc' },
  { title: 'onboarding_3_title', desc: 'onboarding_3_desc' },
] as const;

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const { t } = useTranslation();

  const handleNext = () => {
    if (page < SLIDE_KEYS.length - 1) {
      setPage(page + 1);
    } else {
      onComplete();
    }
  };

  const slide = SLIDE_KEYS[page];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t(slide.title)}</Text>
        <Text style={styles.description}>{t(slide.desc)}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDE_KEYS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {page < SLIDE_KEYS.length - 1 ? t('next') : t('lets_go')}
          </Text>
        </Pressable>

        {page < SLIDE_KEYS.length - 1 && (
          <Pressable onPress={onComplete} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
  },
  dotActive: {
    backgroundColor: '#FF9A76',
    width: 24,
  },
  button: {
    backgroundColor: '#FF9A76',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 28,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  skipButton: {
    marginTop: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#AAA',
  },
});
