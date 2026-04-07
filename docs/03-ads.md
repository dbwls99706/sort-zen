# 03. 광고 정책 / AdManager

> 위치: `src/ads/`
> 라이브러리: `react-native-google-mobile-ads`
> **이 정책은 앱 평점을 결정한다. 절대 어기지 말 것.**

---

## 1. 광고 정책 (절대 원칙)

| 광고 종류 | 노출 위치 | 빈도 | 구독자 |
|---|---|---|---|
| **배너** | 메인 메뉴 / 설정 / 상점 화면 하단만 | 상시 | ❌ 제거 |
| **전면(Interstitial)** | 클래식 모드 레벨 클리어 후 | 3레벨마다 1회 + 60초 쿨다운 | ❌ 제거 |
| **리워드** | 되돌리기 / 힌트 / 코인 2배 / 추가 시도 | 사용자 자율 | ✅ 항상 제공 |

### 절대 원칙

1. **게임 플레이 중 광고 절대 금지** — 어떠한 경우에도 튜브를 만지는 동안 광고가 뜨지 않는다.
2. **ZEN 모드 전면 광고 절대 금지** — 힐링 컨셉 보호.
3. **첫 5분간 전면 광고 금지** — 첫 인상이 광고면 즉시 이탈한다.
4. **3레벨 + 60초 쿨다운 동시 만족 시에만** 전면 노출.
5. **구독자는 배너/전면 모두 비활성화**, 단 리워드는 자율 선택으로 계속 제공.
6. 배너는 게임 화면에 절대 노출하지 않는다.

---

## 2. AdMob 광고 단위 설정

```typescript
// src/ads/AdManager.ts (상단)
import { TestIds } from 'react-native-google-mobile-ads';

const isDev = __DEV__;

export const AD_UNITS = {
  interstitial: isDev
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-XXXXXXXX/YYYYYYYY',
  rewarded: isDev
    ? TestIds.REWARDED
    : 'ca-app-pub-XXXXXXXX/ZZZZZZZZ',
  banner: isDev
    ? TestIds.BANNER
    : 'ca-app-pub-XXXXXXXX/AAAAAAAA',
};
```

> 출시 전 실광고 ID로 교체. AdMob 콘솔에서 발급.

---

## 3. AdManager 구현

```typescript
// src/ads/AdManager.ts
import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { useUserStore } from '@/store/userStore';
import { AD_UNITS } from './constants';

const FIRST_RUN_GRACE_MS = 5 * 60 * 1000;   // 5분
const INTERSTITIAL_COOLDOWN_MS = 60 * 1000; // 60초
const INTERSTITIAL_LEVEL_INTERVAL = 3;

class AdManagerClass {
  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;
  private lastInterstitialAt = 0;
  private clearCount = 0;
  private appStartedAt = Date.now();

  init() {
    this.loadInterstitial();
    this.loadRewarded();
  }

  // ==================== 전면 광고 ====================
  private loadInterstitial() {
    this.interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });

    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {});
    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.loadInterstitial();
    });
    this.interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setTimeout(() => this.loadInterstitial(), 30_000);
    });

    this.interstitial.load();
  }

  /**
   * 클래식 모드 레벨 클리어 후 호출.
   * 정책 enforcement는 모두 이 함수 안에서 처리한다.
   * 호출부는 정책을 알 필요 없이 그냥 호출만 하면 된다.
   */
  async maybeShowInterstitial(mode: 'classic' | 'zen') {
    // 1. ZEN 모드는 절대 금지
    if (mode === 'zen') return;

    // 2. 구독자는 절대 금지
    if (useUserStore.getState().isPremium) return;

    // 3. 첫 5분 grace period
    if (Date.now() - this.appStartedAt < FIRST_RUN_GRACE_MS) return;

    // 4. 3레벨마다
    this.clearCount++;
    if (this.clearCount % INTERSTITIAL_LEVEL_INTERVAL !== 0) return;

    // 5. 60초 쿨다운
    if (Date.now() - this.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;

    // 6. 로드되어 있을 때만
    if (this.interstitial?.loaded) {
      try {
        await this.interstitial.show();
        this.lastInterstitialAt = Date.now();
      } catch {}
    }
  }

  // ==================== 리워드 광고 ====================
  private loadRewarded() {
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

  /**
   * 리워드 광고 표시.
   * onReward는 사용자가 광고를 끝까지 본 경우에만 호출된다.
   * 반환값: 광고를 띄울 수 있었는지 여부
   */
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
        }
      );
      const closeUnsub = this.rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          earnUnsub();
          closeUnsub();
          resolve(earned);
        }
      );

      this.rewarded.show().catch(() => resolve(false));
    });
  }
}

export const AdManager = new AdManagerClass();
```

---

## 4. 배너 컴포넌트

```typescript
// src/ads/banner.tsx
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useUserStore } from '@/store/userStore';
import { AD_UNITS } from './constants';

export function AdBanner() {
  const isPremium = useUserStore((s) => s.isPremium);
  if (isPremium) return null;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
```

**배너 노출 가능 화면**: 메인 메뉴, 상점, 설정, 통계
**배너 노출 금지 화면**: 게임 화면 (classic, zen), 클리어 모달, 온보딩

---

## 5. 리워드 광고 사용 패턴

```typescript
// 게임 화면에서 되돌리기 버튼
const handleUndo = async () => {
  const { coins, spendCoins } = useUserStore.getState();

  if (coins >= 10) {
    spendCoins(10);
    gameStore.undo();
    SoundManager.play('coin');
    return;
  }

  // 코인 부족 → 광고 옵션 제공
  Alert.alert('코인이 부족해요', '광고를 보고 되돌리기를 사용할까요?', [
    { text: '취소', style: 'cancel' },
    {
      text: '광고 보기',
      onPress: async () => {
        const success = await AdManager.showRewarded(() => {
          gameStore.undo();
        });
        if (!success) {
          Alert.alert('광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요.');
        }
      },
    },
  ]);
};
```

---

## 6. GDPR / ATT 동의

```typescript
// app/_layout.tsx
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { AdManager } from '@/ads/AdManager';

useEffect(() => {
  (async () => {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      if (consentInfo.isConsentFormAvailable) {
        await AdsConsent.showForm();
      }
      await mobileAds().initialize();
      AdManager.init();
    } catch (e) {
      console.warn('Ads init failed', e);
    }
  })();
}, []);
```

---

## 7. 호출부 규약

- 컴포넌트나 스토어에서 `react-native-google-mobile-ads`를 직접 import 금지.
- 무조건 `AdManager`의 메서드만 호출한다.
- 정책 판단(구독자/쿨다운/grace)은 모두 `AdManager` 내부에서 한다.
- 호출부는 "광고를 띄워달라"고만 요청하고 결과만 받는다.

---

## 8. 테스트 체크리스트

- [ ] 개발 모드(`__DEV__`)에서 테스트 광고 정상 노출
- [ ] 첫 실행 후 5분간 전면 광고 안 뜸
- [ ] 3레벨 클리어 후 전면 광고 뜸
- [ ] 60초 안에 다시 클리어해도 전면 광고 안 뜸
- [ ] ZEN 모드에서는 클리어해도 전면 광고 안 뜸
- [ ] 구독 활성화 후 배너 즉시 사라짐
- [ ] 구독 활성화 후 전면 광고 안 뜸
- [ ] 구독 활성화 상태에서도 리워드 광고는 여전히 동작
- [ ] 광고 로드 실패 시 30초 후 재시도
- [ ] GDPR 동의 폼 노출 (EU 시뮬레이션)