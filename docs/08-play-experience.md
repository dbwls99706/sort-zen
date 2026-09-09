# 플레이 경험 개선

## 디자인 기준

아래 외부 디자인 스킬의 모바일·게임 지침을 검토해 적용했다.

- [Mobile App UI/UX Design](https://github.com/ceorkm/mobile-app-ui-design/blob/main/SKILL.md): 주행동 중심 위계, 손가락 크기의 터치 영역, 일관된 간격과 표면.
- [Game UI/UX](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md): 상태 중심 HUD, 가변 화면, 모달의 입력 소유, 색상 외 완료 표시.
- [Game Feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md): 게임 상태와 시각 피드백 분리, 반응을 막지 않는 모션, 중요도에 따른 축하 효과.

홈·게임·온보딩·결과 화면에 아이보리/딥틸 기본 테마를 적용했다. 유료 다크·네온 테마와 기존 기능은 유지한다. 게임 도구는 하단에, 상태는 상단에 배치한다. 작은 화면은 실제 가용 영역에 맞춰 배치하며 터치 대상을 작게 줄이는 대신 필요할 때 세로 스크롤한다.

## 입력과 붓기

- Pressable 위치는 고정하고 내부 튜브만 이동한다. 액체·반짝임은 입력을 받지 않는다.
- 탭은 렌더 시점의 캡처값 대신 현재 스토어를 읽는다. 선택 직후 재선택·취소가 즉시 반영된다.
- 붓기 중 탭은 순서대로 대기시켰다가 확정된 보드에서 처리한다.
- 완료 콜백은 고유 토큰과 보드 revision을 검증한다. 중복 완료나 이전 보드의 콜백은 이동을 추가하지 않는다.
- 되돌리기·일시정지·레이아웃 변경 시 진행 중 이동을 한 번 확정하고 대기 입력을 비운다. 화면 종료·재시작에서는 오래된 입력을 폐기한다.
- 이동·기울기·물줄기·유입 높이·복귀는 하나의 선형 진행도를 사용한다. 물이 수신 튜브 입구에 닿은 뒤 수위가 올라간다.
- 한 층 이동 580ms, 네 층 이동 775ms. 장식 효과가 끝나기를 기다리지 않고 결과 화면의 다음 행동을 선택할 수 있다.
- 실제 일시정지와 이어하기, 재시작 확인, 힌트 광고 선택, 광고 준비 실패 안내를 제공한다. 같은 모드로 메뉴에서 돌아오면 현재 세션을 유지한다.

## 성능

- 모든 튜브의 무한 물결·기포 계산과 전체 화면 블러를 제거했다. 선택·붓기·완성 이벤트만 짧게 움직인다.
- 물줄기는 고정 경로의 trim 값만 갱신한다. 매 프레임 경로 복사나 React state 갱신이 없다.
- 보드 생성은 정확히 역재생 가능한 제한된 셔플을 사용한다. 재귀 재시도와 초기 보드 중복 솔버 탐색을 제거했다. 상세는 [코어 로직](01-core-logic.md)을 따른다.
- 힌트 탐색은 취소 가능하며 6ms/64상태 단위로 실행권을 돌려준다.
- ASMR 물리는 UI worklet에서 60Hz 고정 시간 단위로 계산하고 정지 상태에서는 쉰다. 파티클 때문에 전체 화면을 반복 렌더링하지 않는다.
- 웹 ASMR은 같은 물리 함수를 SVG로 렌더링해 CanvasKit 미초기화로 발생하던 진입 오류를 해결했다.
- 사운드 로드는 중복을 합치고 재질별로 나눈다. 늦게 로드된 이전 화면의 BGM·루프는 재생하지 않는다.

서버 JavaScript에서 같은 24개 보드의 생성 중앙값은 기존 1.03ms에서 0.20ms로 감소했다. 2,000개 보드 스트레스에서 최대값은 31.39ms에서 6.27ms였다. 이 수치는 Android 실기기 FPS가 아니다.

## 검증과 실행

타입 검사·ESLint와 24개 테스트 스위트의 216개 테스트를 통과했다. Android Hermes 번들과 웹 프로덕션 내보내기도 통과했다. 390×844 웹 화면에서 빠른 더블탭 선택 취소, 연속 붓기, 일시정지, 메뉴 복귀 후 진행 유지, 힌트 중복 차감 방지, 한 판 클리어, 클리어 후 재진입 시 보상 중복 방지를 직접 확인했다. Android 실기기의 FPS·사운드·햅틱은 측정하지 않았다.

320×568 화면의 스크롤 가능한 게임판과 고정 하단 도구, 웹 ASMR 진입·누르기·재질 전환도 확인했다.

```sh
pnpm install --frozen-lockfile
pnpm verify
pnpm exec expo export --platform android --platform web --output-dir dist
```

웹 화면 검토:

```sh
pnpm export:web
pnpm dev
```

로컬 미리보기의 `/__preview/phone?width=390&height=844` 경로에서 휴대폰 크기로 확인할 수 있다. 예시는 게임판·연속 탭·되돌리기·일시정지·메뉴 재진입·클리어 후 다음 레벨을 포함한다. 웹 결과는 Android 네이티브 Skia 렌더링·촉각·기기별 오디오 성능을 대신하지 않는다.

Windows 설치용 APK:

```powershell
Set-Location D:\mobile\sort-zen
git fetch origin
git switch feat/play-experience
git pull --ff-only origin feat/play-experience
pnpm install --frozen-lockfile
pnpm verify
npx eas-cli build --platform android --profile preview
```

Play Store용 AAB는 마지막 명령의 프로필을 `production`으로 바꾼다. 제출은 별도 단계이다.
