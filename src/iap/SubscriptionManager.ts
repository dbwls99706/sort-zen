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
  Product,
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
        if (receipt) {
          this.activatePremium(purchase.productId);
          await finishTransaction({ purchase, isConsumable: false });
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
    subs: Subscription[];
    products: Product[];
  }> {
    const subs = await getSubscriptions({ skus: SUBSCRIPTION_IDS });
    const products = await getProducts({ skus: PRODUCT_IDS });
    return { subs, products };
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
