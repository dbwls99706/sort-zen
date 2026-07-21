import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  ProductSubscriptionAndroid,
} from 'expo-iap';
import { useUserStore } from '../store/userStore';

const SUBSCRIPTION_IDS = [
  'sortzen_remove_ads_monthly',
  'sortzen_remove_ads_yearly',
];
const PRODUCT_IDS = ['sortzen_remove_ads_lifetime'];

class SubscriptionManagerClass {
  private purchaseUpdateSub: { remove: () => void } | null = null;
  private purchaseErrorSub: { remove: () => void } | null = null;

  async init(): Promise<void> {
    try {
      await initConnection();

      this.purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
        if (!purchase.purchaseToken) return;
        this.activatePremium(purchase.productId);
        // 리스너 콜백은 절대 reject하면 안 된다. finishTransaction이 실패하면
        // 다음 실행 시 restorePurchases가 미완료 거래를 복구한다.
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (e) {
          console.warn('finishTransaction failed', e);
        }
      });

      this.purchaseErrorSub = purchaseErrorListener((err) => {
        console.warn('IAP error', err);
      });

      await this.restorePurchases();
    } catch (e) {
      console.warn('IAP init failed', e);
    }
  }

  async getOfferings(): Promise<{
    monthlyPrice: string;
    yearlyPrice: string;
    lifetimePrice: string;
  }> {
    try {
      const subs =
        (await fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' })) ?? [];
      const products =
        (await fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' })) ?? [];

      const monthly = subs.find((s) => s.id === 'sortzen_remove_ads_monthly');
      const yearly = subs.find((s) => s.id === 'sortzen_remove_ads_yearly');
      const lifetime = products.find(
        (p) => p.id === 'sortzen_remove_ads_lifetime'
      );

      return {
        monthlyPrice: monthly?.displayPrice || '₩2,500',
        yearlyPrice: yearly?.displayPrice || '₩19,900',
        lifetimePrice: lifetime?.displayPrice || '₩9,900',
      };
    } catch (e) {
      console.warn('[SubscriptionManager] Failed to get offerings, returning fallbacks', e);
      return {
        monthlyPrice: '₩2,500',
        yearlyPrice: '₩19,900',
        lifetimePrice: '₩9,900',
      };
    }
  }

  async buySubscription(sku: string): Promise<void> {
    const subs = (await fetchProducts({ skus: [sku], type: 'subs' })) ?? [];
    const sub = subs.find((s) => s.id === sku) as
      | ProductSubscriptionAndroid
      | undefined;
    const offerToken = sub?.subscriptionOfferDetailsAndroid?.[0]?.offerToken;

    await requestPurchase({
      request: {
        google: {
          skus: [sku],
          ...(offerToken
            ? { subscriptionOffers: [{ sku, offerToken }] }
            : {}),
        },
      },
      type: 'subs',
    });
  }

  async buyLifetime(): Promise<void> {
    await requestPurchase({
      request: { google: { skus: PRODUCT_IDS } },
      type: 'in-app',
    });
  }

  async restorePurchases(): Promise<number> {
    try {
      const purchases = await getAvailablePurchases();
      let restored = 0;
      for (const p of purchases) {
        if (
          SUBSCRIPTION_IDS.includes(p.productId) ||
          PRODUCT_IDS.includes(p.productId)
        ) {
          this.activatePremium(p.productId);
          restored++;
        }
      }
      return restored;
    } catch (e) {
      console.warn('restore failed', e);
      return 0;
    }
  }

  private activatePremium(productId: string): void {
    const isLifetime = productId === 'sortzen_remove_ads_lifetime';
    useUserStore
      .getState()
      .setPremium(true, isLifetime ? 'lifetime' : 'subscription');
  }

  destroy(): void {
    this.purchaseUpdateSub?.remove();
    this.purchaseErrorSub?.remove();
    endConnection();
  }
}

export const SubscriptionManager = new SubscriptionManagerClass();
