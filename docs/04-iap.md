# 04. 구독 / IAP (광고 제거)

> 위치: `src/iap/`
> 라이브러리: `react-native-iap`

---

## 1. 상품 설계

| 상품 ID | 종류 | 가격 (KR) | 혜택 |
|---|---|---|---|
| `sortzen_remove_ads_monthly` | 자동 갱신 구독 | ₩2,500/월 | 광고 제거 + 매일 코인 50 |
| `sortzen_remove_ads_yearly` | 자동 갱신 구독 | ₩19,900/년 | 광고 제거 + 매일 코인 50 + 모든 테마 |
| `sortzen_remove_ads_lifetime` | 1회 결제 (비소모성) | ₩9,900 | 광고 영구 제거 + 모든 테마 |

**전략**: 구독 2종 + 평생 1종 동시 제공. 평생 가격을 연간보다 약간 저렴하게 책정해서 "안전한 선택"으로 보이게 만든다 → 평생 결제 전환률이 가장 높음.

---

## 2. Play Console 등록

1. Play Console → 수익 창출 → 인앱 상품
2. 구독 2종 등록 (월간/연간) — base plan + offer
3. 인앱 상품 1종 등록 (평생) — 비소모성 (관리되는 상품)
4. 각 상품 ID는 코드 상수와 정확히 일치시킬 것
5. 가격 책정 → 자동 환율 변환 활성화
6. 구독 약관/취소 안내 문구 작성 (Play 정책 필수)

---

## 3. SubscriptionManager 구현

```typescript
// src/iap/SubscriptionManager.ts
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
import { useUserStore } from '@/store/userStore';

const SUBSCRIPTION_IDS = [
  'sortzen_remove_ads_monthly',
  'sortzen_remove_ads_yearly',
];
const PRODUCT_IDS = ['sortzen_remove_ads_lifetime'];

class SubscriptionManagerClass {
  private purchaseUpdateSub: any = null;
  private purchaseErrorSub: any = null;

  async init() {
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

      // 앱 시작 시 기존 구매 자동 복원
      await this.restorePurchases();
    } catch (e) {
      console.warn('IAP init failed', e);
    }
  }

  async getOfferings(): Promise<{ subs: Subscription[]; products: Product[] }> {
    const subs = await getSubscriptions({ skus: SUBSCRIPTION_IDS });
    const products = await getProducts({ skus: PRODUCT_IDS });
    return { subs, products };
  }

  async buySubscription(sku: string) {
    await requestSubscription({ sku });
  }

  async buyLifetime() {
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

  private activatePremium(productId: string) {
    const isLifetime = productId === 'sortzen_remove_ads_lifetime';
    useUserStore
      .getState()
      .setPremium(true, isLifetime ? 'lifetime' : 'subscription');
  }

  destroy() {
    this.purchaseUpdateSub?.remove();
    this.purchaseErrorSub?.remove();
    endConnection();
  }
}

export const SubscriptionManager = new SubscriptionManagerClass();
```

---

## 4. 상점 화면 (`app/shop.tsx`)

### 레이아웃

```
┌─────────────────────────┐
│   광고 없이 즐기기 ✨    │
├─────────────────────────┤
│                         │
│  💎 평생 이용권          │
│     ₩9,900 (단 1회)     │
│  ✓ 광고 영구 제거        │
│  ✓ 모든 테마 잠금 해제   │
│  [ 구매하기 ]           │
│                         │
│ ─────── 또는 ───────    │
│                         │
│  📅 연간 구독            │
│     ₩19,900/년          │
│     (월 ₩1,658 상당)    │
│  [ 구독하기 ]           │
│                         │
│  📅 월간 구독            │
│     ₩2,500/월           │
│  [ 구독하기 ]           │
│                         │
│  [ 이전 구매 복원 ]      │
│                         │
│  구독은 자동으로 갱신... │
│  (정책 안내 문구)        │
└─────────────────────────┘
```

### 동작

```typescript
// app/shop.tsx (요약)
const handleBuyLifetime = async () => {
  try {
    await SubscriptionManager.buyLifetime();
  } catch (e) {
    Alert.alert('구매 실패', '잠시 후 다시 시도해주세요.');
  }
};

const handleBuySubscription = async (sku: string) => {
  try {
    await SubscriptionManager.buySubscription(sku);
  } catch (e) {
    Alert.alert('구독 실패', '잠시 후 다시 시도해주세요.');
  }
};

const handleRestore = async () => {
  const n = await SubscriptionManager.restorePurchases();
  Alert.alert(
    n > 0 ? '복원 완료' : '복원할 구매 없음',
    n > 0 ? `${n}개의 구매를 복원했습니다.` : '복원 가능한 구매가 없습니다.'
  );
};
```

### 필수 표시 문구 (Play 정책)

```
구독은 결제일 24시간 전까지 취소하지 않으면 자동으로 갱신됩니다.
구독 관리 및 취소는 Google Play 스토어 → 구독에서 가능합니다.
```

---

## 5. userStore 연동

```typescript
// src/store/userStore.ts (관련 부분)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserState = {
  coins: number;
  isPremium: boolean;
  premiumType: 'none' | 'subscription' | 'lifetime';
  setPremium: (v: boolean, type: 'subscription' | 'lifetime') => void;
  // ...
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      coins: 100,
      isPremium: false,
      premiumType: 'none',
      setPremium: (v, type) =>
        set({ isPremium: v, premiumType: v ? type : 'none' }),
      // ...
    }),
    {
      name: 'sortzen-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## 6. 라이프사이클

- **앱 시작**: `_layout.tsx`에서 `SubscriptionManager.init()` 호출
- `init()` 내부에서 자동으로 `restorePurchases()` 실행 → 재설치/기기 변경 시에도 구독자 상태 복원
- **앱 종료**: `SubscriptionManager.destroy()` (메모리 누수 방지)

---

## 7. 호출부 규약

- 컴포넌트에서 `react-native-iap`를 직접 import 금지.
- 무조건 `SubscriptionManager`의 메서드만 호출.
- `isPremium` 상태는 `useUserStore`로만 읽는다.

---

## 8. 테스트 체크리스트

- [ ] Play Console에서 구독 2종 + 평생 1종 등록 완료
- [ ] 라이센스 테스터 계정 등록
- [ ] 내부 테스트 트랙 빌드 업로드
- [ ] 월간 구독 구매 → `isPremium = true` + `premiumType = 'subscription'`
- [ ] 연간 구독 구매 → 동일
- [ ] 평생 구매 → `isPremium = true` + `premiumType = 'lifetime'`
- [ ] 구독 활성화 직후 배너/전면 광고 즉시 제거
- [ ] 앱 재설치 후 "이전 구매 복원" → 상태 복원
- [ ] 앱 시작 시 자동 복원도 동작
- [ ] 구독 취소 후 만료 시점에 `isPremium = false` (서버 검증 단계는 v2로 미룸)
- [ ] 결제 실패 시 사용자에게 친절한 에러 메시지
- [ ] Play Console 정책 안내 문구 노출

---

## 9. 보안 노트 (v1 한계 / v2 계획)

**v1**: 클라이언트에서 영수증을 받아 즉시 `isPremium`을 활성화한다. 단순하지만 우회 가능.

**v2 (출시 후 1~2개월 뒤)**: 백엔드에 영수증 검증 엔드포인트를 만들어 Google Play Developer API로 영수증 진위 검증 후 활성화. 그 전까지는 v1로 충분 (캐주얼 게임이고 결제 금액이 작음).