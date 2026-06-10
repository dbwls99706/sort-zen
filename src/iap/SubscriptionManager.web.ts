export const SubscriptionManager = {
  async init(): Promise<void> {
    console.log('[SubscriptionManager Web Mock] Init IAP');
  },
  async getOfferings(): Promise<{ subs: unknown[]; products: unknown[] }> {
    console.log('[SubscriptionManager Web Mock] Get offerings');
    return {
      subs: [
        {
          productId: 'sortzen_remove_ads_monthly',
          title: 'Monthly Ad Removal (Web Mock)',
          description: 'Remove ads for 1 month',
          localizedPrice: '₩2,500',
          price: '2500',
        },
        {
          productId: 'sortzen_remove_ads_yearly',
          title: 'Yearly Ad Removal (Web Mock)',
          description: 'Remove ads for 1 year',
          localizedPrice: '₩19,900',
          price: '19900',
        }
      ],
      products: [
        {
          productId: 'sortzen_remove_ads_lifetime',
          title: 'Lifetime Ad Removal (Web Mock)',
          description: 'Remove ads permanently',
          localizedPrice: '₩9,900',
          price: '9900',
        }
      ]
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
