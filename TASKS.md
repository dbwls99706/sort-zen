# TASKS

> 위에서 아래로 순차 진행. `[ ]` → `[x]`.
> 새 작업은 발견 즉시 맨 아래에 추가.

## Phase 1: 프로젝트 셋업
- [x] T001 Expo SDK 52 + TypeScript 프로젝트 초기화 — expo-router, strict TS
- [x] T002 디렉토리 구조 생성 (SPEC §2) — 전체 src/ 하위 디렉토리 완성
- [x] T003 의존성 설치 (SPEC §1) — 전체 의존성 설치 완료
- [x] T004 ESLint + Prettier + Husky pre-commit — 완료 (훅 검증은 T006에서)
- [x] T005 Jest + ts-jest 셋업, 샘플 테스트 통과 — ts-jest preset, 샘플 3개 통과
- [ ] T006 `pnpm typecheck`, `pnpm lint`, `pnpm test` 스크립트 동작 확인

## Phase 2: 코어 로직 (docs/01-core-logic.md)
- [ ] T010 `src/core/types.ts`, `constants.ts`
- [ ] T011 `src/core/rules.ts` 구현
- [ ] T012 `src/core/__tests__/rules.test.ts` (docs/01 §6의 케이스 전체)
- [ ] T013 `src/core/generator.ts` 구현
- [ ] T014 `src/core/__tests__/generator.test.ts`
- [ ] T015 `src/core/difficulty.ts`
- [ ] T016 코어 로직 커버리지 80% 이상 확인

## Phase 3: 상태 관리
- [ ] T020 `userStore` (zustand + persist)
- [ ] T021 `settingsStore`
- [ ] T022 `gameStore` (세션 전용)

## Phase 4: 사운드 (docs/02-audio.md)
- [ ] T030 사운드 자산 placeholder 12개 추가 (실 자산은 사람이 교체)
- [ ] T031 `SoundManager` 구현
- [ ] T032 `Haptic` 유틸

## Phase 5: UI 컴포넌트
- [ ] T040 `ThemeProvider` (3테마)
- [ ] T041 `Tube` 컴포넌트 (Skia)
- [ ] T042 `PourAnimation` (Reanimated)
- [ ] T043 `HUD`

## Phase 6: 화면
- [ ] T050 메인 메뉴
- [ ] T051 게임 화면 (classic/zen 라우팅)
- [ ] T052 클리어 모달
- [ ] T053 설정 화면
- [ ] T054 통계 화면
- [ ] T055 온보딩 3컷

## Phase 7: 광고 (docs/03-ads.md)
- [ ] T060 `AdManager` 구현 (테스트 ID로)
- [ ] T061 `AdBanner` 컴포넌트
- [ ] T062 GDPR 동의 통합
- [ ] T063 광고 정책 단위 테스트 (구독자/grace/쿨다운/ZEN 차단)

## Phase 8: 결제 (docs/04-iap.md)
- [ ] T070 `SubscriptionManager` 구현
- [ ] T071 상점 화면
- [ ] T072 구매 복원 동작 확인

## Phase 9: 다국어
- [ ] T080 i18n ko/en 키 정리

## Phase 10: 최종 점검
- [ ] T090 전체 `pnpm typecheck` `pnpm lint` `pnpm test` 통과
- [ ] T091 `pnpm test:coverage` 전체 70% 이상
- [ ] T092 SPEC §8 출시 전 체크리스트 검토