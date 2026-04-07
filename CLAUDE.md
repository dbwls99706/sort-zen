# Sort ZEN

Expo + TypeScript 기반 캐주얼 정렬 퍼즐 게임. 무한 절차적 레벨 + ASMR 사운드 + 광고/구독 수익화.

---

## 작업 원칙

- 모든 구현은 `SPEC.md`를 **단일 진실 공급원(SSOT)** 으로 따른다.
- 주제별 상세는 `docs/` 아래 분할 문서를 참조한다.
- 코어 게임 로직(`src/core/`)은 UI/스토어/사이드이펙트와 완전히 분리된 **순수 함수**로 작성한다.
- 모든 영속 상태는 **zustand + persist (AsyncStorage)** 를 사용한다.
- 광고는 반드시 `AdManager`, 사운드는 `SoundManager`, 결제는 `SubscriptionManager`를 거친다. 컴포넌트에서 SDK를 직접 호출하지 않는다.
- **게임 플레이 중 광고는 절대 금지.** 자세한 정책은 `docs/03-ads.md` 참조.
- ZEN 모드에는 전면 광고를 띄우지 않는다 (힐링 컨셉 보호).
- 첫 실행 후 5분간 전면 광고를 띄우지 않는다 (이탈 방지).
- 구독자(`isPremium === true`)는 배너/전면이 모두 비활성화되며, 리워드 광고는 자율 선택으로 계속 제공한다.

---

## 코드 스타일

- TypeScript strict 모드. `any` 금지.
- 함수형 컴포넌트만. 클래스 컴포넌트 금지.
- 파일 단위는 한 가지 책임만. 100줄 넘으면 분할 검토.
- 매직 넘버 금지. 상수는 `src/core/constants.ts`에 모은다.
- 커밋 메시지는 한국어, conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:` 등).
- 커밋 메시지 본문/푸터에 Claude, AI, Co-Authored-By 등의 언급을 절대 추가하지 않는다.

---

## 참고 문서

- 전체 명세: `SPEC.md`
- 작업 큐: `TASKS.md`
- 진행 로그: `PROGRESS.md`
- 코어 로직 상세: `docs/01-core-logic.md`
- 사운드/햅틱 설계: `docs/02-audio.md`
- 광고 정책 및 AdManager: `docs/03-ads.md`
- 구독/IAP 설계: `docs/04-iap.md`

---

## 자율 작업 프로토콜 (Autonomous Work Protocol)

너는 이 프로젝트를 사람의 추가 지시 없이 끝까지 완성해야 한다.
다음 루프를 무한 반복하라.

### 루프 (한 사이클)

1. **READ**: `TASKS.md`를 읽고 `[ ]` 상태인 첫 번째 미완료 작업을 선택한다.
2. **PLAN**: 그 작업의 acceptance criteria를 `SPEC.md` 또는 관련 `docs/` 파일에서 찾아 옮겨 적고, 구현 계획을 3~7줄로 요약한다.
3. **IMPLEMENT**: 계획대로 코드를 작성한다. **한 작업 = 한 책임.** 범위를 넘지 말 것.
4. **VERIFY**: 아래 검증 게이트를 모두 통과해야 한다. 하나라도 실패하면 IMPLEMENT로 돌아간다.
   - `pnpm typecheck` 통과
   - `pnpm lint` 통과 (warning 0개)
   - `pnpm test -- --findRelatedTests <변경 파일>` 통과
   - 작업이 코어 로직(`src/core/`)이면 해당 파일 커버리지 80% 이상
5. **SELF-REVIEW**: 작성한 코드를 스스로 읽고 다음을 점검한다.
   - SPEC을 정확히 따랐는가?
   - `any` 타입을 썼는가? → 제거
   - 매직 넘버가 있는가? → 상수로 분리
   - 100줄 넘는 파일이 있는가? → 분할
   - 호출부가 정책을 우회할 수 있는가? → 캡슐화
   - 컴포넌트에서 광고/사운드/IAP SDK를 직접 import 했는가? → Manager 경유로 변경
6. **COMMIT**: `git add` → conventional commit 메시지로 커밋. **본문에 Claude/AI 언급 금지.**
7. **UPDATE**: `TASKS.md`에서 해당 항목을 `[x]`로 체크하고 한 줄 메모를 추가한다. `PROGRESS.md`에 사이클 로그 한 줄 append한다.
8. **NEXT**: 다음 미완료 작업으로 돌아가 1번부터 반복한다.

### 멈춰야 할 때 (Stop Conditions)

다음 경우에만 사람에게 질문하고 멈춘다. 그 외에는 절대 멈추지 말 것.

- SPEC 자체가 모순되거나 누락되어 추측이 불가능한 경우
- 외부 계정/키가 필요한데 환경에 없는 경우 (예: AdMob 실광고 ID, IAP 상품 등록)
- 같은 작업에서 검증 게이트를 **5회 이상 연속 실패**한 경우
- `TASKS.md`의 모든 작업이 `[x]`인 경우 → "전체 완료" 보고 후 종료

### 절대 금지

- 검증 게이트를 건너뛰고 다음 작업으로 넘어가기
- 테스트를 통과시키기 위해 테스트를 약화시키기 (예: `expect(true).toBe(true)`로 바꾸기, `.skip` 추가)
- `// TODO`, `// FIXME`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error` 추가 (정말 필요하면 `TASKS.md`에 새 항목으로 등록)
- 한 커밋에 여러 작업을 묶기
- SPEC에 없는 기능을 임의로 추가하기
- 사람에게 "다음에 뭘 할까요?"라고 묻기 — `TASKS.md`가 그 답이다
- 커밋 메시지에 Claude/AI/Co-Authored-By 추가하기

### 검증 실패 시 디버깅 절차

1. 에러 메시지를 정확히 끝까지 읽는다 (스택 트레이스 포함).
2. 가설 1개를 세운다.
3. 최소 변경으로 가설을 검증한다.
4. 실패하면 가설을 폐기하고 새 가설을 세운다. 직전 변경은 되돌린다.
5. 5회 연속 실패 시 멈추고 사람에게 보고한다.

### 작업 발견 시 처리

작업 도중 SPEC에 없는 새 작업이 필요하다고 판단되면:
1. 현재 작업은 그대로 끝낸다 (범위 폭주 금지).
2. `TASKS.md` 맨 아래에 새 항목으로 추가한다.
3. 다음 사이클에서 우선순위에 따라 처리한다.

---

## 작업 우선순위 (Phase 순서)

1. 프로젝트 셋업 (Expo, ESLint, Jest, Husky)
2. 코어 로직 (`src/core/`) — 단위 테스트와 함께
3. 상태 관리 (zustand 스토어 3종)
4. 사운드/햅틱
5. UI 컴포넌트 (Skia 액체 애니메이션 포함)
6. 화면 (메뉴, 게임, 설정, 상점, 통계, 온보딩)
7. 광고 통합
8. 구독/IAP 통합
9. 다국어 (ko/en)
10. 최종 점검 및 빌드

각 Phase는 이전 Phase의 작업이 모두 `[x]`가 된 후에만 시작한다.

---

## 검증 명령어 단일 진입점
```bash
pnpm verify        # typecheck + lint + test (사이클마다 호출)
pnpm verify:full   # + coverage (Phase 종료 시 호출)
```

`pnpm verify`가 통과하지 않은 코드는 절대 커밋하지 않는다. Husky pre-commit 훅이 이를 강제한다.

---

## 핵심 차별화 포인트 (구현 시 항상 의식할 것)

1. **게임 플레이 중 광고 0회** — 평점 4.5+ 사수
2. **Skia 액체 애니메이션 + 12음 실로폰 사운드 + 햅틱** — ASMR 만족감
3. **무한 절차적 생성** — 콘텐츠 무한 공급, 운영 부담 0

이 셋이 다른 100개 Sort puzzle 대비 압도적이지 않으면 어떤 작업도 "완료"가 아니다.