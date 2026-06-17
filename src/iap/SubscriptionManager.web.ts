export const SubscriptionManager = {
  async init(): Promise<void> {
    console.log('[SubscriptionManager Web Mock] Init IAP');
  },
  async getOfferings(): Promise<{
    monthlyPrice: string;
    yearlyPrice: string;
    lifetimePrice: string;
  }> {
    console.log('[SubscriptionManager Web Mock] Get offerings');
    return {
      monthlyPrice: '₩2,500',
      yearlyPrice: '₩19,900',
      lifetimePrice: '₩9,900',
    };
  },
  async buySubscription(sku: string): Promise<void> {
    console.log('[SubscriptionManager Web Mock] Buy subscription:', sku);
  },
  async buyLifetime(): Promise<void> {
    console.log('[SubscriptionManager Web Mock] Buy lifetime product');
  },
  async restorePurchases(): Promise<number> {
    console.log('[SubscriptionManager Web Mock] Restore purchases');
    return 0;
  },
  destroy(): void {
    console.log('[SubscriptionManager Web Mock] Destroy IAP connection');
  }
};
