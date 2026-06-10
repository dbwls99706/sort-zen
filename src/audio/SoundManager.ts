import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';

type SoundKey =
  | 'pour_0'
  | 'pour_1'
  | 'pour_2'
  | 'pour_3'
  | 'pour_4'
  | 'pour_5'
  | 'pour_6'
  | 'pour_7'
  | 'pour_8'
  | 'pour_9'
  | 'pour_10'
  | 'pour_11'
  | 'select'
  | 'deselect'
  | 'complete_tube'
  | 'level_clear'
  | 'coin'
  | 'button_tap'
  | 'slime'
  | 'water_pour'
  | 'shaving_cream'
  | 'handcream'
  | 'sponge';

// ASMR 감각 방 전용 사운드. 용량이 커 시작 시 프리로드하지 않고 최초 재생 때 지연 로드한다.
const ASMR_SOUND_KEYS: readonly SoundKey[] = [
  'slime',
  'water_pour',
  'shaving_cream',
  'handcream',
  'sponge',
];

function isAsmrKey(key: SoundKey): boolean {
  return ASMR_SOUND_KEYS.includes(key);
}

/** 붓기 음계 수 (pour_0 ~ pour_11, C4~G5 — docs/02-audio.md) */
const POUR_NOTE_COUNT = 12;
/** 같은 색 연속 붓기 시 음정 상승 최대 단계 (docs/02-audio.md) */
const POUR_CHAIN_SHIFT_MAX = 2;

function effectVolume(): number {
  const { masterVolume, sfxVolume } = useSettingsStore.getState();
  return masterVolume * sfxVolume;
}

function bgmVolume(): number {
  const { masterVolume, bgmVolume: bgm } = useSettingsStore.getState();
  return masterVolume * bgm;
}

/* eslint-disable @typescript-eslint/no-require-imports */
const SOUND_ASSETS: Record<SoundKey, number> = {
  pour_0: require('./assets/pour_c4.wav'),
  pour_1: require('./assets/pour_d4.wav'),
  pour_2: require('./assets/pour_e4.wav'),
  pour_3: require('./assets/pour_f4.wav'),
  pour_4: require('./assets/pour_g4.wav'),
  pour_5: require('./assets/pour_a4.wav'),
  pour_6: require('./assets/pour_b4.wav'),
  pour_7: require('./assets/pour_c5.wav'),
  pour_8: require('./assets/pour_d5.wav'),
  pour_9: require('./assets/pour_e5.wav'),
  pour_10: require('./assets/pour_f5.wav'),
  pour_11: require('./assets/pour_g5.wav'),
  select: require('./assets/tube_select.wav'),
  deselect: require('./assets/tube_deselect.wav'),
  complete_tube: require('./assets/complete_tube.wav'),
  level_clear: require('./assets/level_clear.wav'),
  coin: require('./assets/coin.wav'),
  button_tap: require('./assets/button_tap.wav'),
  slime: require('./assets/slime.mp3'),
  water_pour: require('./assets/water_pour.mp3'),
  shaving_cream: require('./assets/shaving_cream.mp3'),
  handcream: require('./assets/handcream.mp3'),
  sponge: require('./assets/sponge.mp3'),
};

const BGM_ASSETS = {
  zen: require('./assets/bgm_zen.mp3'),
  classic: require('./assets/bgm_classic.mp3'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

class SoundManagerClass {
  private sounds: Map<SoundKey, Audio.Sound> = new Map();
  private bgm: Audio.Sound | null = null;
  private loaded = false;

  async preload(): Promise<void> {
    if (this.loaded) return;

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
      // 큰 ASMR 자산은 프리로드에서 제외해 시작을 가볍게 유지
      if (isAsmrKey(key as SoundKey)) {
        continue;
      }
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: effectVolume(),
      });
      this.sounds.set(key as SoundKey, sound);
    }

    this.loaded = true;
  }

  async play(key: SoundKey): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;

    let sound = this.sounds.get(key);
    if (!sound) {
      if (isAsmrKey(key)) {
        try {
          const asset = SOUND_ASSETS[key];
          const { sound: newSound } = await Audio.Sound.createAsync(asset, {
            volume: effectVolume(),
          });
          this.sounds.set(key, newSound);
          sound = newSound;
        } catch (e) {
          console.warn(`Failed to load sound on demand: ${key}`, e);
          return;
        }
      } else {
        return;
      }
    }

    try {
      await sound.replayAsync();
    } catch {
      /* ignore */
    }
  }

  /** 설정에서 효과음/전체 볼륨을 바꿨을 때 미리 로드된 효과음에 일괄 반영 */
  async refreshSfxVolume(): Promise<void> {
    const vol = effectVolume();
    await Promise.all(
      [...this.sounds.values()].map((s) =>
        s.setVolumeAsync(vol).catch(() => {
          /* 볼륨 적용 실패 무시 */
        }),
      ),
    );
  }

  /**
   * 붓기 효과음. 색상 ID를 12음 실로폰 음계로 매핑하고,
   * 같은 색을 연속으로 부으면(chainCount) 음이 +1~+2 단계 올라간다.
   * 자산 자체에 마림바 배음 + 물 텍스처가 합성되어 있다 (T102).
   */
  async playPour(colorId: number, chainCount = 0): Promise<void> {
    const shift = Math.min(chainCount, POUR_CHAIN_SHIFT_MAX);
    const note = (colorId + shift) % POUR_NOTE_COUNT;
    await this.play(`pour_${note}` as SoundKey);
  }

  async playBGM(track: 'zen' | 'classic'): Promise<void> {
    if (!useSettingsStore.getState().bgmEnabled) return;

    if (this.bgm) {
      const oldBgm = this.bgm;
      this.bgm = null;
      try {
        await oldBgm.unloadAsync();
      } catch {
        // ignore
      }
    }

    try {
      const asset = BGM_ASSETS[track];
      const { sound } = await Audio.Sound.createAsync(asset, {
        isLooping: true,
        volume: bgmVolume(),
      });
      this.bgm = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('Failed to play BGM', e);
    }
  }

  /** 설정에서 BGM 볼륨을 바꿨을 때 재생 중인 트랙에 즉시 반영 */
  async refreshBgmVolume(): Promise<void> {
    if (!this.bgm) return;
    try {
      await this.bgm.setVolumeAsync(bgmVolume());
    } catch {
      /* 볼륨 적용 실패 무시 */
    }
  }

  async stopBGM(): Promise<void> {
    const sound = this.bgm;
    if (sound) {
      this.bgm = null;
      try {
        await sound.stopAsync();
      } catch {
        // ignore
      }
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
  }

  async unloadAll(): Promise<void> {
    for (const s of this.sounds.values()) {
      try {
        await s.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.sounds.clear();
    await this.stopBGM();
    this.loaded = false;
  }
}

export const SoundManager = new SoundManagerClass();
