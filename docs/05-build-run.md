# 빌드 & 실기기 실행 가이드

> 코드 검증(`pnpm verify`)과 별개로, **실기기에서 직접 보고 확인**하기 위한 단계.
> Skia 연출·붓기 스트림·컨페티·사운드·햅틱은 실기기에서만 제대로 검증된다.

---

## 0. 중요: 이 앱은 Expo Go로 못 돈다

`react-native-google-mobile-ads`(AdMob), `react-native-iap`(결제),
`@shopify/react-native-skia`, `react-native-reanimated`(네이티브 모듈)를 쓰므로
**Expo Go 앱으로는 실행 불가**다. 반드시 **개발 빌드(dev client)** 또는
**EAS 빌드**로 설치해야 한다.

---

## 1. 의존성 설치 (pnpm 호이스팅 필수)

이 저장소는 `.npmrc`에 `node-linker=hoisted`가 설정되어 있다.
(없으면 Metro가 `@babel/runtime`을 못 찾아 **번들 자체가 실패**한다.)

```bash
pnpm install
```

### 번들 스모크 테스트 (기기 없이 오류 조기 발견)

```bash
npx expo export --platform ios   # 또는 android
```

`Exported: ...`가 뜨면 import/에셋/워클릿 해석까지 정상. 에러가 나면 그 메시지부터 해결.

---

## 2. 가장 빠른 확인: Android 개발/프리뷰 빌드 (EAS)

> 클라우드 빌드라 macOS 없이 Android APK를 받을 수 있다. EAS 계정 필요.

```bash
npm i -g eas-cli      # 최초 1회
eas login
eas build:configure   # 이미 eas.json 있으면 생략 가능

# 설치형 APK (가장 간편, 실기기에 바로 설치)
eas build -p android --profile preview
```

빌드 완료 후 나오는 URL/QR로 APK를 폰에 설치 → 실행.

- **dev client**(코드 수정하며 핫리로드로 확인)가 필요하면:
  ```bash
  eas build -p android --profile development
  npx expo start --dev-client
  ```

### iOS

```bash
eas build -p ios --profile preview     # Apple 개발자 계정 필요
```

---

## 3. 로컬 네이티브 빌드(선택)

macOS/Android SDK가 있으면 prebuild 후 로컬 실행 가능:

```bash
npx expo prebuild         # ios/ android/ 네이티브 프로젝트 생성
npx expo run:android      # 또는 run:ios (macOS)
```

---

## 4. 실기기에서 꼭 눈으로 볼 체크리스트

- [ ] **붓기 스트림**이 소스→대상 입구에 정확히 정렬되는가(가로 어긋남 없음)
- [ ] 튜브 **그라데이션/유리광택/기포**가 의도대로 보이는가 (3개 테마 모두)
- [ ] 튜브 **완성 글로우/팝** + `complete_tube` 사운드가 나는가
- [ ] **클리어 컨페티/별 버스트**가 터지는가
- [ ] 튜브 **12색이 서로 구분**되는가(파스텔)
- [ ] 튜브 14개+(고레벨/ZEN)에서 **레이아웃 오버플로/잘림 없는가**
- [ ] **볼륨 컨트롤**(master/SFX/BGM) 단계 조절 + 음소거 동작
- [ ] **저사양 기기에서 붓기/배경이 60fps 유지**되는가 (→ 안 되면 TASKS T138)

---

## 5. 출시 전 외부 작업(코드 밖)

`MANUAL.md` 참조. 요약:
- AdMob **iosAppId** 추가 (현재 `app.json`엔 androidAppId만 있어 iOS 빌드 시 경고)
- 실광고 단위 ID, Play Console IAP 상품 등록(`sortzen_*`)
- 스토어 스크린샷/아이콘/개인정보 URL, Data Safety 선언
