import { ScreenLayout } from '../src/components/ScreenLayout';
import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../src/components/ThemeProvider';
import { useUserStore } from '../src/store/userStore';
import { SubscriptionManager } from '../src/iap/SubscriptionManager';
import { SoundManager } from '../src/audio/SoundManager';
import { Haptic } from '../src/utils/haptics';
import { AdManager } from '../src/ads/AdManager';
import { REWARDED_COIN_AMOUNT } from '../src/core/constants';
import { useTranslation } from '../src/i18n';

export default function ShopScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const isPremium = useUserStore((s) => s.isPremium);
  const premiumType = useUserStore((s) => s.premiumType);
  const coins = useUserStore((s) => s.coins);
  const addCoins = useUserStore((s) => s.addCoins);
  const [pending, setPending] = React.useState<string | null>(null);
  const actionInFlight = React.useRef(false);
  const mounted = React.useRef(true);
  const screenActive = React.useRef(false);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      screenActive.current = true;
      return () => {
        screenActive.current = false;
      };
    }, []),
  );

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    onError = () => Alert.alert(t('purchase_failed'), t('try_again')),
  ) => {
    if (actionInFlight.current || !screenActive.current) return;
    actionInFlight.current = true;
    setPending(key);
    try {
      await action();
    } catch {
      if (screenActive.current) onError();
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setPending(null);
    }
  };

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
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleWatchAdForCoins = () =>
    runAction(
      'coins',
      async () => {
        SoundManager.play('button_tap');
        Haptic.light();
        const earned = await AdManager.showRewarded(() => {
          addCoins(REWARDED_COIN_AMOUNT);
          if (screenActive.current) SoundManager.play('coin');
        });
        if (!screenActive.current) return;
        if (earned) {
          Haptic.success();
          Alert.alert(t('coins_earned', { n: REWARDED_COIN_AMOUNT }));
        } else {
          Alert.alert(t('ad_not_ready'));
        }
      },
      () => Alert.alert(t('ad_not_ready')),
    );

  const handleBuyLifetime = () => runAction('lifetime', () => SubscriptionManager.buyLifetime());
  const handleBuySubscription = (sku: string) =>
    runAction(sku, () => SubscriptionManager.buySubscription(sku));
  const handleRestore = () =>
    runAction('restore', async () => {
      const n = await SubscriptionManager.restorePurchases();
      if (!screenActive.current) return;
      Alert.alert(
        n > 0 ? t('restored') : t('nothing_to_restore'),
        n > 0 ? `${n} ${t('purchases_restored')}` : t('no_restorable'),
      );
    });

  return (
    <ScreenLayout title={t('shop')} onBack={handleBack}>
      {/* 무료 코인 — 리워드 광고로 코인을 충전해 힌트 등에 사용 (구독자에게도 자율 제공) */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {t('free_coins')} · 🪙 {coins}
        </Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
          {t('free_coins_desc')}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[
            styles.buyButton,
            { backgroundColor: theme.accent },
            pending !== null && styles.pending,
          ]}
          disabled={pending !== null}
          accessibilityState={{ disabled: pending !== null, busy: pending === 'coins' }}
          onPress={handleWatchAdForCoins}
        >
          <Text style={styles.buyButtonText}>
            {pending === 'coins'
              ? t('processing')
              : t('watch_ad_coins', { n: REWARDED_COIN_AMOUNT })}
          </Text>
        </Pressable>
      </View>

      {isPremium ? (
        <View style={styles.premiumBadge}>
          <Text style={[styles.premiumText, { color: theme.accentInk }]}>
            {t('premium_active')} ({premiumType})
          </Text>
        </View>
      ) : (
        <View style={styles.products}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.accentInk }]}>{t('lifetime')}</Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>{prices.lifetime}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {t('remove_ads_forever')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('lifetime')}: ${t('buy')}`}
              style={[
                styles.buyButton,
                { backgroundColor: theme.accent },
                pending !== null && styles.pending,
              ]}
              disabled={pending !== null}
              accessibilityState={{ disabled: pending !== null, busy: pending === 'lifetime' }}
              onPress={handleBuyLifetime}
            >
              <Text style={styles.buyButtonText}>
                {pending === 'lifetime' ? t('processing') : t('buy')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
              {t('or_subscribe')}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('yearly')}</Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>{prices.yearly}/yr</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('yearly')}: ${t('subscribe')}`}
              style={[
                styles.subButton,
                { borderColor: theme.accentInk },
                pending !== null && styles.pending,
              ]}
              disabled={pending !== null}
              accessibilityState={{
                disabled: pending !== null,
                busy: pending === 'sortzen_remove_ads_yearly',
              }}
              onPress={() => handleBuySubscription('sortzen_remove_ads_yearly')}
            >
              <Text style={[styles.subButtonText, { color: theme.accentInk }]}>
                {pending === 'sortzen_remove_ads_yearly' ? t('processing') : t('subscribe')}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('monthly')}</Text>
            <Text style={[styles.cardPrice, { color: theme.text }]}>{prices.monthly}/mo</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('monthly')}: ${t('subscribe')}`}
              style={[
                styles.subButton,
                { borderColor: theme.accentInk },
                pending !== null && styles.pending,
              ]}
              disabled={pending !== null}
              accessibilityState={{
                disabled: pending !== null,
                busy: pending === 'sortzen_remove_ads_monthly',
              }}
              onPress={() => handleBuySubscription('sortzen_remove_ads_monthly')}
            >
              <Text style={[styles.subButtonText, { color: theme.accentInk }]}>
                {pending === 'sortzen_remove_ads_monthly' ? t('processing') : t('subscribe')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.restoreButton, pending !== null && styles.pending]}
            disabled={pending !== null}
            accessibilityState={{ disabled: pending !== null, busy: pending === 'restore' }}
            onPress={handleRestore}
            accessibilityRole="button"
          >
            <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
              {pending === 'restore' ? t('processing') : t('restore')}
            </Text>
          </Pressable>

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            {t('subscription_disclaimer')}
          </Text>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  cardPrice: { fontSize: 24, fontWeight: 'bold', marginVertical: 8, textAlign: 'center' },
  cardDesc: { fontSize: 13, marginBottom: 12, textAlign: 'center' },
  pending: { opacity: 0.65 },
  buyButton: {
    minWidth: 144,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buyButtonText: {
    textAlign: 'center',
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subButton: {
    minWidth: 144,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 20,
    borderWidth: 2,
    marginTop: 8,
  },
  subButtonText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  divider: { alignItems: 'center' },
  dividerText: { fontSize: 13 },
  restoreButton: {
    minHeight: 48,
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
