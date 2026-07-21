# Sort ZEN — 전체 설계 명세 (SPEC)

> 단일 진실 공급원 (Single Source of Truth)
> 1인 개발 / Expo + TypeScript / 광고 + 구독 수익 모델

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 장르 | 캐주얼 정렬 퍼즐 (Sort puzzle) |
| 핵심 컨셉 | 실패 없는 ZEN + 만족스러운 ASMR + 무한 절차적 레벨 |
| 플랫폼 | Android 우선 (Play Store), iOS는 추후 |
| 스택 | Expo SDK 54 / TypeScript / Reanimated 4 / Skia / Zustand |
| 수익 모델 | AdMob (배너/전면/리워드) + 광고 제거 구독/평생 |
| 타겟 ARPDAU | $0.05~0.15 (캐주얼 퍼즐 평균) |

---

## 1. 기술 스택

```json
{
  "expo": "~54.0.0",
  "react-native": "0.81.x",
  "typescript": "~5.9.0",
  "zustand": "^5.0.0",
  "react-native-reanimated": "~4.1.0",
  "@shopify/react-native-skia": "2.2.x",
  "react-native-google-mobile-ads": "^16.4.0",
  "expo-iap": "^4.6.0",
  "expo-haptics": "~15.0.0",
  "expo-av": "~16.0.0",
  "@react-native-async-storage/async-storage": "2.2.x",
  "expo-localization": "~17.0.0",
  "expo-router": "~6.0.0"
}
```

> Android 타겟: `targetSdkVersion 36` (Android 16) — Play 정책상 2026-08-31부터 필수.
> 결제: `expo-iap`의 OpenIAP(openiap-google)가 Play Billing Library 9.x를 사용 —
> Play 정책상 2026-08-31부터 Billing 8.0.0+ 필수.

---

## 2. 디렉토리 구조

```
sort-zen/
├── CLAUDE.md
├── SPEC.md
├── docs/
│   ├── 01-core-logic.md
│   ├── 02-audio.md
│   ├── 03-ads.md
│   └── 04-iap.md
├── app/                          # expo-router
│   ├── _layout.tsx
│   ├── index.tsx                 # 메인 메뉴
│   ├── game/[mode].tsx           # classic | zen
│   ├── shop.tsx
│   └── settings.tsx
├── src/
│   ├── core/                     # 게임 로직 (UI 무관, 순수 함수)
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── rules.ts
│   │   ├── generator.ts
│   │   └── difficulty.ts
│   ├── store/
│   │   ├── gameStore.ts
│   │   ├── userStore.ts
│   │   └── settingsStore.ts
│   ├── ads/
│   │   ├── AdManager.ts
│   │   └── banner.tsx
│   ├── iap/
│   │   └── SubscriptionManager.ts
│   ├── audio/
│   │   ├── SoundManager.ts
│   │   └── assets/
│   ├── components/
│   │   ├── Tube.tsx
│   │   ├── PourAnimation.tsx
│   │   ├── HUD.tsx
│   │   └── ThemeProvider.tsx
│   ├── i18n/
│   │   ├── ko.json
│   │   └── en.json
│   └── utils/
│       ├── seedrandom.ts
│       └── haptics.ts
└── assets/
    ├── icon.png
    └── sounds/
```

---

## 3. 화면 흐름

```
[스플래시]
   ↓
[GDPR/ATT 동의]
   ↓
[메인 메뉴] ──→ [설정] [상점] [통계]
   │
   ├──→ [클래식 모드] (레벨 1, 2, 3...)
   │       ↓ 클리어
   │    [클리어 모달] ──→ 다음 레벨 (3레벨마다 전면광고)
   │
   └──→ [ZEN 모드] (무한 랜덤, BGM, 광고 없음)
           ↓
        끝없이 새 보드 자동 생성
```

---

## 4. 모듈별 책임 (요약)

| 모듈 | 책임 | 상세 문서 |
|---|---|---|
| `src/core/` | 게임 규칙, 보드 생성, 난이도 곡선 | `docs/01-core-logic.md` |
| `src/audio/` | 사운드 재생, BGM 루프, 햅틱 | `docs/02-audio.md` |
| `src/ads/` | AdMob 통합, 광고 정책 enforcement | `docs/03-ads.md` |
| `src/iap/` | 구독/평생 결제, 구매 복원 | `docs/04-iap.md` |
| `src/store/` | zustand 상태 (게임/유저/설정) | 본 문서 §5 |
| `src/components/` | Skia 렌더링, UI 컴포넌트 | 본 문서 §6 |

---

## 5. 상태 관리 (zustand)

### 5.1 userStore

```typescript
type UserState = {
  coins: number;
  level: number;          // 클래식 모드 최대 도달 레벨
  isPremium: boolean;
  premiumType: 'none' | 'subscription' | 'lifetime';
  totalPlayTime: number;  // 초
  totalCleared: number;
  setPremium: (v: boolean, type: 'subscription' | 'lifetime') => void;
  spendCoins: (n: number) => boolean;
  addCoins: (n: number) => void;
  incrementLevel: () => void;
};
```

persist 키: `sortzen-user`

### 5.2 settingsStore

```typescript
type SettingsState = {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  hapticEnabled: boolean;
  theme: 'pastel' | 'neon' | 'dark';
  language: 'ko' | 'en';
  toggleSound: () => void;
  // ...
};
```

persist 키: `sortzen-settings`

### 5.3 gameStore

세션 동안만 유지. persist 안 함.

```typescript
type GameStoreState = {
  tubes: Tube[];
  moves: Move[];
  selectedTube: number | null;
  mode: 'classic' | 'zen';
  level: number;
  startNewGame: (mode: 'classic' | 'zen', level?: number) => void;
  selectTube: (id: number) => void;
  undo: () => void;
  reset: () => void;
};
```

---

## 6. UI / 컴포넌트

### 6.1 Tube 컴포넌트 (Skia)

- 유리 튜브 외곽선 + 내부 액체 레이어
- 액체는 색상별로 경계가 부드럽게 표현 (살짝 출렁임 애니메이션)
- 선택 시 위로 20px 부드럽게 이동
- 단색 완성 시 별 폭죽 (Skia particle)

### 6.2 PourAnimation

- 두 튜브가 정해지면 첫 튜브가 기울고, 액체가 호를 그리며 두 번째 튜브로 이동
- Reanimated 3 worklet으로 60fps 보장
- 애니메이션 중에는 입력 차단

### 6.3 HUD

- 상단: 레벨 번호, 코인, 되돌리기 버튼, 일시정지
- 하단: 튜브 격자
- 클리어 시 모달: 별 3개, "다음 레벨" / "메뉴"

### 6.4 ThemeProvider

- pastel / neon / dark 3종
- 색상 토큰만 교체 (튜브 색, 배경, 액센트)
- 다크/네온은 평생 구독자 전용 (부분 잠금)

---

## 7. 1일 작업 타임라인 (16시간)

| 시간 | 작업 |
|---|---|
| 00:00–01:00 | Expo 셋업, 디렉토리, AdMob 계정, IAP 상품 등록 |
| 01:00–03:00 | 코어 로직 + 단위 테스트 (`docs/01-core-logic.md`) |
| 03:00–05:30 | Skia 액체 애니메이션, 튜브 컴포넌트, 붓기 인터랙션 |
| 05:30–07:00 | 사운드 자산, `SoundManager`, 햅틱 (`docs/02-audio.md`) |
| 07:00–08:30 | 게임 스토어, 클래식/ZEN 라우팅, HUD |
| 08:30–10:00 | 코인/되돌리기/힌트 메타, 통계 |
| 10:00–11:30 | `AdManager`, 배너/전면/리워드, GDPR (`docs/03-ads.md`) |
| 11:30–13:00 | `SubscriptionManager`, 상점 UI (`docs/04-iap.md`) |
| 13:00–14:00 | 메인 메뉴, 설정, 온보딩 3컷, i18n |
| 14:00–15:00 | 실기기 QA, 난이도 밸런싱 |
| 15:00–15:30 | 아이콘, 스크린샷, 스토어 설명, 개인정보처리방침 |
| 15:30–16:00 | EAS Build → Play Console 내부 테스트 업로드 |

---

## 8. 출시 전 체크리스트

**기능**
- [ ] 무한 레벨 생성기가 항상 풀리는 보드 보장
- [ ] ZEN 모드 BGM 루프 정상
- [ ] 모든 색상의 pour 사운드 매핑
- [ ] 햅틱 on/off 동작
- [ ] 다국어 (ko/en) 동작

**광고**
- [ ] 테스트 광고 ID 동작 확인
- [ ] 실광고 ID로 교체
- [ ] 첫 5분 전면 차단 동작
- [ ] 60초 쿨다운 동작
- [ ] 구독자 광고 완전 차단
- [ ] GDPR 동의 폼 노출

**IAP**
- [ ] 구독 2종 + 평생 1종 등록 완료
- [ ] 구매 → isPremium 즉시 반영
- [ ] 앱 재시작 후 구매 복원 동작
- [ ] "이전 구매 복원" 버튼 동작
- [ ] 구독 취소 안내 문구 (Play 정책 필수)

**스토어**
- [ ] 아이콘 512×512
- [ ] 피처 그래픽 1024×500
- [ ] 스크린샷 최소 2장 (권장 5장)
- [ ] 개인정보처리방침 URL
- [ ] 데이터 안전 섹션 작성
- [ ] 광고 포함 체크
- [ ] 만 3세 이상 등급

---

## 9. 출시 후 KPI

| 지표 | 목표 (1개월) |
|---|---|
| MAU | 1,000+ |
| D1 리텐션 | 35%+ |
| D7 리텐션 | 15%+ |
| 평균 세션 | 5분+ |
| 일일 광고 노출/유저 | 8회+ |
| 구독 전환률 | 1%+ |
| 평점 | 4.5+ |

---

## 10. 핵심 차별화 포인트

1. **게임 플레이 중 광고 0회** — 평점 4.5+ 사수
2. **Skia 액체 애니메이션 + 12음 실로폰 사운드 + 햅틱** — ASMR 만족감
3. **무한 절차적 생성** — 콘텐츠 무한 공급, 운영 부담 0

이 셋이 다른 100개 Sort puzzle 대비 압도적이면 나머지(광고/구독 수익)는 자동으로 따라온다.