# 02. 사운드 / 햅틱 설계

> 위치: `src/audio/`, `src/utils/haptics.ts`
> 핵심 차별화 포인트. **이 모듈의 품질이 게임의 평점을 결정한다.**

---

## 1. 사운드 자산 목록

| 파일명 | 용도 | 비고 |
|---|---|---|
| `pour_c4.mp3` ~ `pour_g5.mp3` | 액체 붓기 (12음 실로폰) | 색상 ID 0~11 매핑 |
| `tube_select.mp3` | 튜브 선택 | 부드러운 톡 |
| `tube_deselect.mp3` | 선택 해제 | |
| `complete_tube.mp3` | 단색 튜브 완성 | 띵! |
| `level_clear.mp3` | 레벨 클리어 | 짧은 멜로디 (1.5초) |
| `coin.mp3` | 코인 획득 | |
| `button_tap.mp3` | UI 버튼 | |
| `bgm_zen.mp3` | ZEN 모드 BGM | 60초 심리스 루프, 잔잔 |
| `bgm_classic.mp3` | 클래식 모드 BGM | 60초 심리스 루프, 끄기 가능 |

**자산 생성**: `scripts/synth_audio.py`로 절차적 합성. ASMR 핵심 요건을 코드로 보장한다.
- **마림바 비조화 배음**(1 : 3.9 : 9.2 : 16.6) + 온셋 피치드롭 + 말렛 노이즈 → 정수배 합성톤과 달리 실로폰/마림바 특유의 타격 음색.
- **물 텍스처 레이어**(밴드패스 노이즈 스윕 + 물방울 레조넌스)를 붓기음 아래 은은히 → 액체 ASMR 질감.
- **모노 세이프 스테레오**: 드라이 톤은 센터(모노)에 두고 리버브 꼬리만 좌우 디코릴레이션 → 폰 단일 스피커에서도 위상 상쇄 없음.
- 부드러운 저역통과 + tanh 소프트새츄레이션으로 고역 하쉬니스 제거(힐링 톤).

> 더 높은 품질이 필요하면 GarageBand 실로폰 실연주 녹음으로 교체 가능. 합성본은 출시 가능 수준의 기본값.

**파일 형식**: 효과음은 `wav`(짧은 연속 재생 시 갭리스), BGM은 `mp3`(스테레오 60초 ≈ 0.9MB). 전체 오디오 자산 3.4MB.

---

## 2. SoundManager (`src/audio/SoundManager.ts`)

```typescript
import { Audio } from 'expo-av';
import { useSettingsStore } from '@/store/settingsStore';

type SoundKey =
  | 'pour_0' | 'pour_1' | 'pour_2' | 'pour_3'
  | 'pour_4' | 'pour_5' | 'pour_6' | 'pour_7'
  | 'pour_8' | 'pour_9' | 'pour_10' | 'pour_11'
  | 'select' | 'deselect' | 'complete_tube'
  | 'level_clear' | 'coin' | 'button_tap';

class SoundManagerClass {
  private sounds: Map<SoundKey, Audio.Sound> = new Map();
  private bgm: Audio.Sound | null = null;
  private loaded = false;

  async preload() {
    if (this.loaded) return;

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    const map: Record<SoundKey, any> = {
      pour_0: require('./assets/pour_c4.mp3'),
      pour_1: require('./assets/pour_d4.mp3'),
      pour_2: require('./assets/pour_e4.mp3'),
      pour_3: require('./assets/pour_f4.mp3'),
      pour_4: require('./assets/pour_g4.mp3'),
      pour_5: require('./assets/pour_a4.mp3'),
      pour_6: require('./assets/pour_b4.mp3'),
      pour_7: require('./assets/pour_c5.mp3'),
      pour_8: require('./assets/pour_d5.mp3'),
      pour_9: require('./assets/pour_e5.mp3'),
      pour_10: require('./assets/pour_f5.mp3'),
      pour_11: require('./assets/pour_g5.mp3'),
      select: require('./assets/tube_select.mp3'),
      deselect: require('./assets/tube_deselect.mp3'),
      complete_tube: require('./assets/complete_tube.mp3'),
      level_clear: require('./assets/level_clear.mp3'),
      coin: require('./assets/coin.mp3'),
      button_tap: require('./assets/button_tap.mp3'),
    };

    for (const [key, asset] of Object.entries(map)) {
      const { sound } = await Audio.Sound.createAsync(asset, { volume: 0.7 });
      this.sounds.set(key as SoundKey, sound);
    }

    this.loaded = true;
  }

  async play(key: SoundKey) {
    if (!useSettingsStore.getState().soundEnabled) return;
    const sound = this.sounds.get(key);
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {}
  }

  /**
   * 색상 ID로 자동 음정 매핑.
   * 같은 색을 연속으로 부으면 음이 살짝 올라가는 효과는
   * 호출부에서 chainCount를 받아 +0~+2로 변형 가능.
   */
  async playPour(colorId: number) {
    const key = `pour_${colorId % 12}` as SoundKey;
    await this.play(key);
  }

  async playBGM(track: 'zen' | 'classic') {
    if (!useSettingsStore.getState().bgmEnabled) return;

    if (this.bgm) {
      await this.bgm.unloadAsync();
      this.bgm = null;
    }

    const asset =
      track === 'zen'
        ? require('./assets/bgm_zen.mp3')
        : require('./assets/bgm_classic.mp3');

    const { sound } = await Audio.Sound.createAsync(asset, {
      isLooping: true,
      volume: 0.3,
    });
    this.bgm = sound;
    await sound.playAsync();
  }

  async stopBGM() {
    if (this.bgm) {
      await this.bgm.stopAsync();
      await this.bgm.unloadAsync();
      this.bgm = null;
    }
  }

  async unloadAll() {
    for (const s of this.sounds.values()) {
      await s.unloadAsync();
    }
    this.sounds.clear();
    await this.stopBGM();
    this.loaded = false;
  }
}

export const SoundManager = new SoundManagerClass();
```

---

## 3. 햅틱 (`src/utils/haptics.ts`)

```typescript
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settingsStore';

export const Haptic = {
  light: () => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavy: () => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  success: () => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
```

---

## 4. 사운드/햅틱 트리거 매핑

| 이벤트 | 사운드 | 햅틱 |
|---|---|---|
| 튜브 선택 | `select` | `light` |
| 튜브 선택 해제 | `deselect` | `light` |
| 액체 부음 (성공) | `playPour(colorId)` | `medium` |
| 부을 수 없는 곳 탭 | (없음) | `light` |
| 단색 튜브 완성 | `complete_tube` | `success` |
| 레벨 클리어 | `level_clear` | `success` |
| 코인 획득 | `coin` | `light` |
| UI 버튼 | `button_tap` | `light` |

---

## 5. 라이프사이클

- **앱 시작**: `_layout.tsx`에서 `SoundManager.preload()` 호출
- **게임 화면 진입**: `playBGM('classic')` 또는 `playBGM('zen')`
- **게임 화면 이탈**: `stopBGM()`
- **앱 백그라운드**: BGM 자동 일시정지 (expo-av 기본 동작)
- **앱 종료**: `unloadAll()` (메모리 누수 방지)

---

## 6. 주의사항

- `replayAsync`는 동일 사운드가 빠르게 연속 재생되어도 끊기지 않게 처리한다.
- BGM 볼륨은 효과음(0.7)보다 낮게 (0.3) 설정해 효과음이 묻히지 않도록.
- iOS에서는 `playsInSilentModeIOS: false`로 무음 모드 존중.
- 사운드 자산 총 용량은 5MB 이하로 (앱 크기 영향).