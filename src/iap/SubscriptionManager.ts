import {
  initConnection,
  endConnection,
  getSubscriptions,
  getProducts,
  requestSubscription,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  Subscription,
} from 'react-native-iap';
import type { SubscriptionAndroid } from 'react-native-iap';
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
        const receipt = purchase.transactionReceipt;
        if (!receipt) return;
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
      const subs = await getSubscriptions({ skus: SUBSCRIPTION_IDS });
      const products = await getProducts({ skus: PRODUCT_IDS });

      const monthly = subs.find((s) => s.productId === 'sortzen_remove_ads_monthly');
      const yearly = subs.find((s) => s.productId === 'sortzen_remove_ads_yearly');
      const lifetime = products.find((p) => p.productId === 'sortzen_remove_ads_lifetime');

      const getSubPrice = (sub: Subscription | undefined, defaultPrice: string) => {
        if (!sub) return defaultPrice;
        const androidSub = sub as SubscriptionAndroid;
        const offerDetails = androidSub.subscriptionOfferDetails;
        if (offerDetails && offerDetails.length > 0) {
          const phases = offerDetails[0]?.pricingPhases?.pricingPhaseList;
          if (phases && phases.length > 0) {
            return phases[0].formattedPrice;
          }
        }
        // iOS는 localizedPrice를 제공한다(Android 타입엔 없으므로 in으로 내로잉).
        if ('localizedPrice' in sub) {
          return sub.localizedPrice || defaultPrice;
        }
        return defaultPrice;
      };

      return {
        monthlyPrice: getSubPrice(monthly, '₩2,500'),
        yearlyPrice: getSubPrice(yearly, '₩19,900'),
        lifetimePrice: lifetime?.localizedPrice || '₩9,900',
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
    const subs = await getSubscriptions({ skus: [sku] });
    const sub = subs[0] as SubscriptionAndroid | undefined;
    const offerToken =
      sub?.subscriptionOfferDetails?.[0]?.offerToken;

    await requestSubscription({
      sku,
      ...(offerToken ? { subscriptionOffers: [{ sku, offerToken }] } : {}),
    });
  }

  async buyLifetime(): Promise<void> {
    await requestPurchase({ skus: PRODUCT_IDS });
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
