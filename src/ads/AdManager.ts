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

class AdManagerClass {
  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;
  private lastInterstitialAt = 0;
  private clearCount = 0;
  private appStartedAt = Date.now();

  async init(): Promise<void> {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      if (consentInfo.isConsentFormAvailable) {
        await AdsConsent.showForm();
      }
      await mobileAds().initialize();
    } catch (e) {
      console.warn('Ads init failed', e);
    }
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
    const isPremium = useUserStore.getState().isPremium;
    if (isPremium) return;
    // grace period 동안의 클리어는 카운트하지 않는다 (정책 카운터 시맨틱 보존).
    if (Date.now() - this.appStartedAt < FIRST_RUN_GRACE_MS) return;

    this.clearCount++;

    // 노출 여부 판단은 단위 테스트로 검증된 순수 정책 함수에 위임한다.
    const allowed = shouldShowInterstitial({
      mode,
      isPremium,
      appStartedAt: this.appStartedAt,
      now: Date.now(),
      clearCount: this.clearCount,
      lastInterstitialAt: this.lastInterstitialAt,
    });
    if (!allowed) return;

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
