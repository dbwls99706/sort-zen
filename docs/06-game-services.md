# 06 · Google Play Games Services (로그인 + 리더보드)

선택적 Google 로그인과 "최고 도달 단계" 리더보드. 안드로이드 전용.

## 1. 아키텍처

- 컴포넌트는 SDK를 직접 호출하지 않고 `GameServicesManager`를 거친다 (CLAUDE.md 정책).
- 네이티브 바인딩: `react-native-google-leaderboards-and-achievements` (Play Games v2 SDK).
- 웹/비안드로이드: `GameServicesManager.web.ts` no-op 스텁.
- 점수 산정 순수 로직: `src/core/leaderboard.ts` (`levelToScore`) — 단위 테스트 포함.
- 식별자: `src/services/constants.ts`.
- 로그인은 **선택적**. 게스트는 로컬 진척으로 계속 플레이하고, 로그인 시에만
  최고 도달 단계를 리더보드에 기록한다 (ZEN 힐링 컨셉/이탈 방지).

### 점수 정의

무한 절차적 생성이므로 점수 = **최고 도달 단계**(`userStore.level`). 클래식 클리어로
레벨이 오를 때마다, 그리고 로그인 직후에 제출한다.

## 2. 코드 흐름

| 시점 | 호출 |
|------|------|
| 앱 시작 (`_layout.tsx`) | `GameServicesManager.init()` — 이전 로그인 복원 |
| 메뉴 '리더보드' 탭 | 미로그인 시 `signIn()` → `showLeaderboard()` |
| 설정 '계정' | `signIn()` / `signOut()` |
| 클래식 레벨 클리어 | `submitBestScore()` |

## 3. 출시 전 필수 외부 설정 (사람이 직접)

> 아래는 외부 계정 작업이라 코드로 자동화할 수 없다. 완료 전까지 모든 호출은
> 안전하게 no-op이며, 게스트 플레이는 정상 동작한다.

1. **Play Console → Play Games Services → 설정 및 관리 → 구성**
   - 새 게임 만들기 → `com.sortzen.app`과 연결.
   - 생성된 **프로젝트 ID(숫자)** 확보.
2. **OAuth 동의 화면 / 사용자 인증 정보**
   - Google Cloud 프로젝트 자동 연결 → OAuth client 생성.
   - 앱 서명키 **SHA-1** 등록. EAS 빌드는
     `eas credentials` → Android → 키스토어의 SHA-1 사용.
3. **리더보드 생성**
   - "최고 도달 단계" 리더보드 추가 (정렬: 큰 값이 상위, 정수).
   - 생성된 **리더보드 ID(`CgkI...`)** 확보.
4. **테스터 등록** — 출시 전 테스트 계정 추가(미등록 시 로그인 실패).

## 4. 코드에 ID 반영

1. `src/services/constants.ts`
   ```ts
   export const LEADERBOARD_ID_HIGHEST_LEVEL = 'CgkI...'; // 실제 리더보드 ID
   ```
2. `app.json` 플러그인 props의 `appId`를 프로젝트 ID(숫자)로 교체
   ```json
   ["./plugins/withPlayGamesServices", { "appId": "123456789012" }]
   ```
3. `npx expo prebuild --clean` → EAS 빌드. (manifest에 APP_ID 메타데이터 주입 확인)

## 5. 한계 / 후속

- 이 라이브러리는 **리더보드 + 도전과제**만 지원한다. 전체 진척(코인·도전과제·설정)의
  기기 간 클라우드 동기화는 Play Games **Saved Games** API 또는 별도 백엔드가 필요하며
  현재 범위 밖이다. 리더보드 점수가 최고 도달 단계의 서버 기록 역할을 한다.
- 네이티브 바인딩 메서드명(login/checkAuth/submitScore/showLeaderboard)은 라이브러리
  문서 기준이다. dev build에서 1회 스모크 테스트로 반환 형태를 확인할 것
  (`GameServicesManager.applyAuth`가 방어적으로 파싱).
