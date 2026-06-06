# TASKS

> 위에서 아래로 순차 진행. `[ ]` → `[x]`.
> 새 작업은 발견 즉시 맨 아래에 추가.

## Phase 1: 프로젝트 셋업
- [x] T001 Expo SDK 52 + TypeScript 프로젝트 초기화 — expo-router, strict TS
- [x] T002 디렉토리 구조 생성 (SPEC §2) — 전체 src/ 하위 디렉토리 완성
- [x] T003 의존성 설치 (SPEC §1) — 전체 의존성 설치 완료
- [x] T004 ESLint + Prettier + Husky pre-commit — 완료 (훅 검증은 T006에서)
- [x] T005 Jest + ts-jest 셋업, 샘플 테스트 통과 — ts-jest preset, 샘플 3개 통과
- [x] T006 `pnpm typecheck`, `pnpm lint`, `pnpm test` 스크립트 동작 확인 — Husky 훅 포함 전체 통과

## Phase 2: 코어 로직 (docs/01-core-logic.md)
- [x] T010 `src/core/types.ts`, `constants.ts` — T002에서 생성, SPEC 일치 확인
- [x] T011 `src/core/rules.ts` 구현 — 6개 함수, SPEC 일치
- [x] T012 `src/core/__tests__/rules.test.ts` (docs/01 §6의 케이스 전체) — 21개 통과
- [x] T013 `src/core/generator.ts` 구현 — 역방향 생성, seedrandom 결정론적
- [x] T014 `src/core/__tests__/generator.test.ts` — 7개 통과
- [x] T015 `src/core/difficulty.ts` — getDifficulty, getZenParams 구현
- [x] T016 코어 로직 커버리지 80% 이상 확인 — 98.9% Stmts 달성

## Phase 3: 상태 관리
- [x] T020 `userStore` (zustand + persist) — AsyncStorage persist 완료
- [x] T021 `settingsStore` — persist 완료
- [x] T022 `gameStore` (세션 전용) — selectTube/undo/reset/pour 연동

## Phase 4: 사운드 (docs/02-audio.md)
- [x] T030 사운드 자산 placeholder 20개 추가 — 실 자산은 사람이 교체
- [x] T031 `SoundManager` 구현 — 18 효과음 + BGM 2종
- [x] T032 `Haptic` 유틸 — 4종 피드백 + 설정 연동

## Phase 5: UI 컴포넌트
- [x] T040 `ThemeProvider` (3테마) — pastel/neon/dark 12색 팔레트
- [x] T041 `Tube` 컴포넌트 (Skia) — 외곽선 + 액체 + spring 선택
- [x] T042 `PourAnimation` (Reanimated) — 호 궤적 + 입력 차단
- [x] T043 `HUD` — 레벨/코인/undo/reset/pause

## Phase 6: 화면
- [x] T050 메인 메뉴 — Classic/ZEN + Settings/Shop/Stats
- [x] T051 게임 화면 (classic/zen 라우팅) — gameStore 연동
- [x] T052 클리어 모달 — 별 3개 + 다음/메뉴
- [x] T053 설정 화면 — toggle 3종 + 테마 선택
- [x] T054 통계 화면 — 4개 stat card
- [x] T055 온보딩 3컷 — 3페이지 + skip

## Phase 7: 광고 (docs/03-ads.md)
- [x] T060 `AdManager` 구현 (테스트 ID로) — 정책 enforcement 포함
- [x] T061 `AdBanner` 컴포넌트 — 구독자 비노출
- [x] T062 GDPR 동의 통합 — _layout.tsx에서 초기화
- [x] T063 광고 정책 단위 테스트 — 10개 통과

## Phase 8: 결제 (docs/04-iap.md)
- [x] T070 `SubscriptionManager` 구현 — 구독 2종 + 평생 + 자동복원
- [x] T071 상점 화면 — 평생/연간/월간 + 복원 + 정책 문구
- [x] T072 구매 복원 동작 확인 — 코드 수준 검증 (실기기는 계정 필요)

## Phase 9: 다국어
- [x] T080 i18n ko/en 키 정리 — 52키 + useTranslation 훅

## Phase 10: 최종 점검
- [x] T090 전체 `pnpm typecheck` `pnpm lint` `pnpm test` 통과 — 77 tests, 0 warnings
- [x] T091 `pnpm test:coverage` 전체 70% 이상 — 95% Stmts 달성
- [x] T092 SPEC §8 출시 전 체크리스트 검토 — 코드 수준 전체 확인, 외부 계정 필요 항목만 잔여

## Phase 11: 통합 (Integration)
- [x] T093 `SubscriptionManager.init()` → `_layout.tsx`에서 호출 + destroy cleanup — 완료
- [x] T094 `AdBanner` 배치 → 메인메뉴/설정/상점/통계 화면 하단 (docs/03 §1) — 완료
- [x] T095 온보딩 첫 실행 게이트 → settingsStore에 `hasSeenOnboarding` + index.tsx 조건부 렌더 — 완료
- [x] T096 i18n 적용 → 모든 화면/컴포넌트 하드코딩 문자열을 `t()` 호출로 교체 + 언어 선택 UI — 완료
- [x] T097 테마 잠금 → neon/dark 구독자 전용 (SPEC §6.4) — 완료

## Phase 12: 검토 후속 (Review follow-up)
- [x] T098 광고 정책 일원화 → AdManager가 검증된 `shouldShowInterstitial` 호출 + 상수 중복 제거 — 완료
- [x] T099 Tube 액체 파동 애니메이션 커밋 (working tree 미커밋분 정리) — 완료
- [x] T100 스토어/앱 아이콘·피처그래픽 진짜 PNG 재생성 (JPEG-in-png 수정, 피처 1024x500) — 완료
- [x] T101 출시 매뉴얼/스토어 메타데이터 문서 커밋 — 완료
- [x] T102 ASMR 사운드 절차적 재합성 (마림바 비조화 배음 + 물 텍스처 + 모노세이프 스테레오, BGM mp3) — 완료
- [x] T103 컬렉션 도전과제 + 데일리 과제 (리텐션) — 코어/스토어/UI/i18n 완료. 메뉴·게임 연결 코드는 작업트리에 잔여(사용자 WIP와 동일 파일)

## Phase 13: juice 오버홀 (도파민/ASMR 체감 강화)
### P0 — 코어 루프 만족감
- [x] T110 진짜 액체 붓기 연출 — Skia 스트림(trim 호 reveal) + 착지 스플래시, 게임 화면 연결, 착지 시 store 커밋 + 사운드 동기화
- [x] T111 Tube 고급 렌더링 — 색별 수직 그라데이션 + 유리 광택 스트라이프/림라이트 + 메니스커스 + 떠오르는 기포. geometry/color 모듈 분리
- [x] T112 per-tube 완성 보상 — isTubeComplete 순수함수(+테스트), 신규 완성 감지 시 complete_tube 사운드+햅틱, Tube 글로우(BlurMask)+팝 스케일
- [x] T113 ClearModal juice — 카드 스프링 바운스 인 + 별 3개 스태거 스케일 + Skia 컨페티(결정적 의사난수 22개)
### P1 — 팔레트 & 화면 일관성
- [x] T114 파스텔 12색 hue 분리 재튜닝(색상환 균등 분산) + 유리 외곽선 대비 상향. 네온/다크는 이미 충분히 구분되어 유지
- [ ] T115 메뉴/게임 배경 그라데이션 + 은은한 보케(브랜드 톤)
### P2 — 폴리시
- [ ] T116 반응형 튜브 크기/레이아웃 — 튜브 수에 따라 스케일, 오버플로 방지
- [ ] T117 HUD 텍스트 글리프 → 벡터 아이콘셋
- [ ] T118 설정 볼륨 슬라이더(master/SFX/BGM) + ZEN 지속 앰비언스
- [ ] T119 온보딩 붓기 애니메이션 일러스트

## Phase 14: 바이럴 장치 (SPEC 밖, 추후)
- [ ] T120 만족스러운 클리어 공유 — 결과 카드/짧은 클립 내보내기
- [ ] T121 데일리 스트릭 가시적 훅 강화