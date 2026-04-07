import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { useUserStore } from '../store/userStore';
import { AD_UNITS } from './constants';

const FIRST_RUN_GRACE_MS = 5 * 60 * 1000;
const INTERSTITIAL_COOLDOWN_MS = 60 * 1000;
const INTERSTITIAL_LEVEL_INTERVAL = 3;

class AdManagerClass {
  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;
  private lastInterstitialAt = 0;
  private clearCount = 0;
  private appStartedAt = Date.now();

  init(): void {
    this.loadInterstitial();
    this.loadRewarded();
  }

  private loadInterstitial(): void {
    this.interstitial = InterstitialAd.createForAdRequest(
      AD_UNITS.interstitial,
      { requestNonPersonalizedAdsOnly: false },
    );

    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {});
    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.loadInterstitial();
    });
    this.interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setTimeout(() => this.loadInterstitial(), 30_000);
    });

    this.interstitial.load();
  }

  async maybeShowInterstitial(mode: 'classic' | 'zen'): Promise<void> {
    if (mode === 'zen') return;
    if (useUserStore.getState().isPremium) return;
    if (Date.now() - this.appStartedAt < FIRST_RUN_GRACE_MS) return;

    this.clearCount++;
    if (this.clearCount % INTERSTITIAL_LEVEL_INTERVAL !== 0) return;
    if (Date.now() - this.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS)
      return;

    if (this.interstitial?.loaded) {
      try {
        await this.interstitial.show();
        this.lastInterstitialAt = Date.now();
      } catch {
        /* 광고 표시 실패 무시 */
      }
    }
  }

  private loadRewarded(): void {
    this.rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });

    this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      this.loadRewarded();
    });
    this.rewarded.addAdEventListener(AdEventType.ERROR, () => {
      setTimeout(() => this.loadRewarded(), 30_000);
    });

    this.rewarded.load();
  }

  showRewarded(onReward: () => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.rewarded?.loaded) {
        resolve(false);
        return;
      }

      let earned = false;
      const earnUnsub = this.rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
          onReward();
        },
      );
      const closeUnsub = this.rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          earnUnsub();
          closeUnsub();
          resolve(earned);
        },
      );

      this.rewarded.show().catch(() => resolve(false));
    });
  }
}

export const AdManager = new AdManagerClass();
