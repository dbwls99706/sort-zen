import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/components/ThemeProvider';
import { useUserStore } from '../src/store/userStore';
import { SubscriptionManager } from '../src/iap/SubscriptionManager';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';

export default function ShopScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isPremium = useUserStore((s) => s.isPremium);
  const premiumType = useUserStore((s) => s.premiumType);

  const handleBack = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  };

  const handleBuyLifetime = async () => {
    try {
      await SubscriptionManager.buyLifetime();
    } catch {
      Alert.alert('Purchase Failed', 'Please try again later.');
    }
  };

  const handleBuySubscription = async (sku: string) => {
    try {
      await SubscriptionManager.buySubscription(sku);
    } catch {
      Alert.alert('Subscription Failed', 'Please try again later.');
    }
  };

  const handleRestore = async () => {
    const n = await SubscriptionManager.restorePurchases();
    Alert.alert(
      n > 0 ? 'Restored' : 'Nothing to Restore',
      n > 0
        ? `${n} purchase(s) restored.`
        : 'No restorable purchases found.',
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Text style={[styles.backText, { color: theme.accent }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Shop</Text>
        <View style={styles.spacer} />
      </View>

      {isPremium ? (
        <View style={styles.premiumBadge}>
          <Text style={[styles.premiumText, { color: theme.accent }]}>
            Premium Active ({premiumType})
          </Text>
        </View>
      ) : (
        <View style={styles.products}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.accent }]}>
              Lifetime
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              ₩9,900
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Remove ads forever + All themes
            </Text>
            <Pressable
              style={[styles.buyButton, { backgroundColor: theme.accent }]}
              onPress={handleBuyLifetime}
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
              or subscribe
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Yearly
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              ₩19,900/yr
            </Text>
            <Pressable
              style={[styles.subButton, { borderColor: theme.accent }]}
              onPress={() =>
                handleBuySubscription('sortzen_remove_ads_yearly')
              }
            >
              <Text style={[styles.subButtonText, { color: theme.accent }]}>
                Subscribe
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Monthly
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              ₩2,500/mo
            </Text>
            <Pressable
              style={[styles.subButton, { borderColor: theme.accent }]}
              onPress={() =>
                handleBuySubscription('sortzen_remove_ads_monthly')
              }
            >
              <Text style={[styles.subButtonText, { color: theme.accent }]}>
                Subscribe
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.restoreButton} onPress={handleRestore}>
            <Text
              style={[styles.restoreText, { color: theme.textSecondary }]}
            >
              Restore Purchases
            </Text>
          </Pressable>

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            Subscriptions auto-renew unless cancelled 24 hours before the
            renewal date. Manage subscriptions in Google Play Store →
            Subscriptions.
          </Text>
        </View>
      )}
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
  backText: { fontSize: 24 },
  title: { fontSize: 20, fontWeight: 'bold' },
  spacer: { width: 24 },
  premiumBadge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumText: { fontSize: 20, fontWeight: 'bold' },
  products: { marginTop: 16, gap: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardPrice: { fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
  cardDesc: { fontSize: 13, marginBottom: 12, textAlign: 'center' },
  buyButton: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 24,
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subButton: {
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 20,
    borderWidth: 2,
    marginTop: 8,
  },
  subButtonText: { fontSize: 14, fontWeight: '600' },
  divider: { alignItems: 'center' },
  dividerText: { fontSize: 13 },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
