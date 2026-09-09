import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './ThemeProvider';
import { useTranslation } from '../i18n';
import { AdBanner } from '../ads/banner';

/** Keeps reading and control widths comfortable on phones, tablets and split screens. */
export function ScreenLayout({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={onBack}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Text style={[styles.arrow, { color: theme.text }]}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.column}>{children}</View>
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  back: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  arrow: { fontSize: 32, lineHeight: 36 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24 },
  column: { width: '100%', maxWidth: 520 },
});
