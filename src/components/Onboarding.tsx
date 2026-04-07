import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Sort by Color',
    description: 'Tap a tube to pick up liquid,\nthen tap another to pour it in.',
  },
  {
    title: 'Match Colors',
    description: 'Fill each tube with one color.\nEmpty tubes help you sort!',
  },
  {
    title: 'Relax & Enjoy',
    description: 'No time limit, no ads during play.\nJust pure sorting zen.',
  },
];

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      setPage(page + 1);
    } else {
      onComplete();
    }
  };

  const slide = SLIDES[page];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {page < SLIDES.length - 1 ? 'Next' : "Let's Go!"}
          </Text>
        </Pressable>

        {page < SLIDES.length - 1 && (
          <Pressable onPress={onComplete} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
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
