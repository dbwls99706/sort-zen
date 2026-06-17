import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/components/ThemeProvider';
import { useUserStore } from '../src/store/userStore';
import { SubscriptionManager } from '../src/iap/SubscriptionManager';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdBanner } from '../src/ads/banner';
import { useTranslation } from '../src/i18n';

export default function ShopScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const isPremium = useUserStore((s) => s.isPremium);
  const premiumType = useUserStore((s) => s.premiumType);

  const [prices, setPrices] = React.useState({
    monthly: '₩2,500',
    yearly: '₩19,900',
    lifetime: '₩9,900',
  });

  React.useEffect(() => {
    let active = true;
    SubscriptionManager.getOfferings()
      .then((res) => {
        if (active) {
          setPrices({
            monthly: res.monthlyPrice,
            yearly: res.yearlyPrice,
            lifetime: res.lifetimePrice,
          });
        }
      })
      .catch((e) => {
        console.warn('Failed to load offerings', e);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleBack = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  };

  const handleBuyLifetime = async () => {
    try {
      await SubscriptionManager.buyLifetime();
    } catch {
      Alert.alert(t('purchase_failed'), t('try_again'));
    }
  };

  const handleBuySubscription = async (sku: string) => {
    try {
      await SubscriptionManager.buySubscription(sku);
    } catch {
      Alert.alert(t('purchase_failed'), t('try_again'));
    }
  };

  const handleRestore = async () => {
    const n = await SubscriptionManager.restorePurchases();
    Alert.alert(
      n > 0 ? t('restored') : t('nothing_to_restore'),
      n > 0
        ? `${n} ${t('purchases_restored')}`
        : t('no_restorable'),
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
        <Text style={[styles.title, { color: theme.text }]}>{t('shop')}</Text>
        <View style={styles.spacer} />
      </View>

      {isPremium ? (
        <View style={styles.premiumBadge}>
          <Text style={[styles.premiumText, { color: theme.accent }]}>
            {t('premium_active')} ({premiumType})
          </Text>
        </View>
      ) : (
        <View style={styles.products}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.accent }]}>
              {t('lifetime')}
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              {prices.lifetime}
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {t('remove_ads_forever')}
            </Text>
            <Pressable
              style={[styles.buyButton, { backgroundColor: theme.accent }]}
              onPress={handleBuyLifetime}
            >
              <Text style={styles.buyButtonText}>{t('buy')}</Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
              {t('or_subscribe')}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('yearly')}
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              {prices.yearly}/yr
            </Text>
            <Pressable
              style={[styles.subButton, { borderColor: theme.accent }]}
              onPress={() =>
                handleBuySubscription('sortzen_remove_ads_yearly')
              }
            >
              <Text style={[styles.subButtonText, { color: theme.accent }]}>
                {t('subscribe')}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('monthly')}
            </Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>
              {prices.monthly}/mo
            </Text>
            <Pressable
              style={[styles.subButton, { borderColor: theme.accent }]}
              onPress={() =>
                handleBuySubscription('sortzen_remove_ads_monthly')
              }
            >
              <Text style={[styles.subButtonText, { color: theme.accent }]}>
                {t('subscribe')}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.restoreButton} onPress={handleRestore}>
            <Text
              style={[styles.restoreText, { color: theme.textSecondary }]}
            >
              {t('restore')}
            </Text>
          </Pressable>

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            {t('subscription_disclaimer')}
          </Text>
        </View>
      )}

      <AdBanner />
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
