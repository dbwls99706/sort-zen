export const AdManager = {
  init(): void {
    console.log('[AdManager Web Mock] Init ads');
  },
  async maybeShowInterstitial(mode: 'classic' | 'zen'): Promise<void> {
    console.log('[AdManager Web Mock] Maybe show interstitial for mode:', mode);
  },
  showRewarded(onReward: () => void): Promise<boolean> {
    console.log('[AdManager Web Mock] Show rewarded ad');
    onReward();
    return Promise.resolve(true);
  }
};
