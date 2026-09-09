import mobileAds, {
  AdsConsent,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { useUserStore } from '../store/userStore';
import { AD_UNITS } from './constants';
import { shouldShowInterstitial, FIRST_RUN_GRACE_MS } from './adPolicy';

const RELOAD_DELAY_MS = 30_000;
const PRESENTATION_TIMEOUT_MS = 15_000;
const CLOSE_TIMEOUT_MS = 180_000;
type FullscreenAd = InterstitialAd | RewardedAd;
type RewardSession = {
  ad: RewardedAd;
  earned: boolean;
  resolve: (earned: boolean) => void;
  unsubscribe: () => void;
};

class AdManagerClass {
  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;
  private interstitialListeners: (() => void)[] = [];
  private rewardedListeners: (() => void)[] = [];
  private interstitialRetry: ReturnType<typeof setTimeout> | null = null;
  private rewardedRetry: ReturnType<typeof setTimeout> | null = null;
  private presentationTimer: ReturnType<typeof setTimeout> | null = null;
  private fullscreenAd: FullscreenAd | null = null;
  private presentationId = 0;
  private rewardSession: RewardSession | null = null;
  private initialization: Promise<void> | null = null;
  private lastInterstitialAt = 0;
  private clearCount = 0;
  private appStartedAt = Date.now();

  init(): Promise<void> {
    this.initialization ??= this.initialize();
    return this.initialization;
  }

  private async initialize(): Promise<void> {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      if (consentInfo.isConsentFormAvailable) await AdsConsent.showForm();
      await mobileAds().initialize();
    } catch (error) {
      console.warn('Ads init failed', error);
    }
    this.loadInterstitial();
    this.loadRewarded();
  }

  private watchPresentation(
    ad: FullscreenAd,
    onTimeout: () => void,
    delay = PRESENTATION_TIMEOUT_MS,
  ): void {
    if (this.presentationTimer !== null) clearTimeout(this.presentationTimer);
    this.presentationTimer = setTimeout(() => {
      this.presentationTimer = null;
      if (this.fullscreenAd === ad) onTimeout();
    }, delay);
  }

  private releasePresentation(ad: FullscreenAd): void {
    if (this.fullscreenAd !== ad) return;
    if (this.presentationTimer !== null) clearTimeout(this.presentationTimer);
    this.presentationTimer = null;
    this.fullscreenAd = null;
  }

  private retryInterstitial(): void {
    if (this.interstitialRetry !== null) return;
    this.interstitialRetry = setTimeout(() => {
      this.interstitialRetry = null;
      this.loadInterstitial();
    }, RELOAD_DELAY_MS);
  }

  private loadInterstitial(): void {
    try {
      if (!this.interstitial) {
        const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
          requestNonPersonalizedAdsOnly: false,
        });
        this.interstitial = ad;
        this.interstitialListeners = [
          ad.addAdEventListener(AdEventType.OPENED, () => {
            if (this.fullscreenAd === ad)
              this.watchPresentation(ad, () => this.retireInterstitial(ad), CLOSE_TIMEOUT_MS);
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            if (this.interstitial !== ad) return;
            this.releasePresentation(ad);
            this.loadInterstitial();
          }),
          ad.addAdEventListener(AdEventType.ERROR, () => {
            if (this.interstitial !== ad) return;
            this.releasePresentation(ad);
            this.retryInterstitial();
          }),
        ];
      }
      // The SDK resets loaded/isLoadCalled on CLOSED and ERROR. Reuse its
      // native event subscription instead of creating another ad every cycle.
      this.interstitial.load();
    } catch {
      this.retryInterstitial();
    }
  }

  private retireInterstitial(ad: InterstitialAd): void {
    if (this.interstitial !== ad) return;
    this.releasePresentation(ad);
    this.interstitialListeners.forEach((unsubscribe) => unsubscribe());
    this.interstitialListeners = [];
    this.interstitial = null;
    this.retryInterstitial();
  }

  async maybeShowInterstitial(mode: 'classic' | 'zen'): Promise<void> {
    if (mode === 'zen') return;
    const isPremium = useUserStore.getState().isPremium;
    if (isPremium) return;
    if (Date.now() - this.appStartedAt < FIRST_RUN_GRACE_MS) return;
    this.clearCount++;
    const allowed = shouldShowInterstitial({
      mode,
      isPremium,
      appStartedAt: this.appStartedAt,
      now: Date.now(),
      clearCount: this.clearCount,
      lastInterstitialAt: this.lastInterstitialAt,
    });
    const ad = this.interstitial;
    if (!allowed || !ad?.loaded || this.fullscreenAd) return;
    this.fullscreenAd = ad;
    const presentationId = ++this.presentationId;
    this.watchPresentation(ad, () => this.retireInterstitial(ad));
    try {
      await ad.show();
      if (this.presentationId === presentationId) this.lastInterstitialAt = Date.now();
    } catch {
      if (this.presentationId === presentationId && this.fullscreenAd === ad)
        this.retireInterstitial(ad);
    }
  }

  private retryRewarded(): void {
    if (this.rewardedRetry !== null) return;
    this.rewardedRetry = setTimeout(() => {
      this.rewardedRetry = null;
      this.loadRewarded();
    }, RELOAD_DELAY_MS);
  }

  private loadRewarded(): void {
    try {
      if (!this.rewarded) {
        const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
          requestNonPersonalizedAdsOnly: false,
        });
        this.rewarded = ad;
        this.rewardedListeners = [
          ad.addAdEventListener(AdEventType.OPENED, () => {
            if (this.fullscreenAd === ad)
              this.watchPresentation(ad, () => this.retireRewarded(ad), CLOSE_TIMEOUT_MS);
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            if (this.rewarded !== ad) return;
            this.finishRewarded(ad);
            this.loadRewarded();
          }),
          ad.addAdEventListener(AdEventType.ERROR, () => {
            if (this.rewarded !== ad) return;
            this.finishRewarded(ad);
            this.retryRewarded();
          }),
        ];
      }
      this.rewarded.load();
    } catch {
      this.retryRewarded();
    }
  }

  private finishRewarded(ad: RewardedAd): void {
    const session = this.rewardSession;
    if (!session || session.ad !== ad) return;
    this.rewardSession = null;
    this.releasePresentation(ad);
    session.unsubscribe();
    session.resolve(session.earned);
  }

  private retireRewarded(ad: RewardedAd): void {
    if (this.rewarded !== ad) return;
    this.finishRewarded(ad);
    this.rewardedListeners.forEach((unsubscribe) => unsubscribe());
    this.rewardedListeners = [];
    this.rewarded = null;
    this.retryRewarded();
  }

  showRewarded(onReward: () => void): Promise<boolean> {
    const ad = this.rewarded;
    if (!ad?.loaded || this.fullscreenAd || this.rewardSession) return Promise.resolve(false);

    return new Promise((resolve) => {
      const session: RewardSession = { ad, earned: false, resolve, unsubscribe: () => {} };
      this.rewardSession = session;
      this.fullscreenAd = ad;
      this.presentationId++;
      session.unsubscribe = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        if (this.rewardSession !== session || session.earned) return;
        session.earned = true;
        try {
          onReward();
        } catch (error) {
          console.warn('Reward callback failed', error);
        }
      });
      this.watchPresentation(ad, () => this.retireRewarded(ad));
      try {
        ad.show().catch(() => {
          // A late rejection from a closed ad must not cancel the next session.
          if (this.rewardSession === session) this.retireRewarded(ad);
        });
      } catch {
        if (this.rewardSession === session) this.retireRewarded(ad);
      }
    });
  }
}

export const AdManager = new AdManagerClass();
