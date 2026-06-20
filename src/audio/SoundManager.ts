import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';
import { ASMR_POOLS, type AsmrMaterial } from './asmrPools';

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
  | 'button_tap';

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
  // ASMR 접촉 루프 — 누르고 문지르는 동안 끊김 없이 이어지는 단일 인스턴스(볼륨 변조)
  private loopSound: Audio.Sound | null = null;
  private loopAsset: number | null = null;
  // ASMR 재질 풀(CC0) 사운드 캐시 — 자산 모듈 id로 캐싱해 재사용한다.
  private asmrSounds: Map<number, Audio.Sound> = new Map();
  // 풀별 직전 선택 인덱스 — 바로 같은 소리가 연속되지 않게 한다(랜덤성 체감 ↑).
  private lastPick: Map<string, number> = new Map();

  async preload(): Promise<void> {
    if (this.loaded) return;

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: effectVolume(),
      });
      this.sounds.set(key as SoundKey, sound);
    }

    this.loaded = true;
  }

  async play(key: SoundKey): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const sound = this.sounds.get(key);
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {
      /* ignore */
    }
  }

  /** 풀에서 직전과 다른 항목을 랜덤 선택 (풀 크기 1이면 그대로). */
  private pickFromPool(pool: number[], tag: string): number {
    if (pool.length <= 1) return pool[0];
    let idx = Math.floor(Math.random() * pool.length);
    if (idx === this.lastPick.get(tag)) idx = (idx + 1) % pool.length;
    this.lastPick.set(tag, idx);
    return pool[idx];
  }

  /** ASMR 풀 사운드 지연 로드 + 캐시 (자산 모듈 id 기준). */
  private async getAsmrSound(asset: number): Promise<Audio.Sound | null> {
    const cached = this.asmrSounds.get(asset);
    if (cached) return cached;
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: effectVolume(),
      });
      this.asmrSounds.set(asset, sound);
      return sound;
    } catch (e) {
      console.warn('Failed to load ASMR sound', e);
      return null;
    }
  }

  /** ASMR 임팩트 풀을 미리 디코드해 첫 터치 지연을 없앤다(감각 방 진입 시 호출). */
  async preloadAsmr(): Promise<void> {
    const assets = new Set<number>();
    for (const mat of Object.keys(ASMR_POOLS) as AsmrMaterial[]) {
      for (const a of ASMR_POOLS[mat].impacts) assets.add(a);
    }
    await Promise.all(
      [...assets].map((a) =>
        this.getAsmrSound(a).then(() => {
          /* 결과 무시 */
        }),
      ),
    );
  }

  /** 닿는 순간 터지는 임팩트 — 재질 풀에서 매번 랜덤(첨벙/찰싹/꾸덕 등). */
  async playImpact(material: AsmrMaterial): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const asset = this.pickFromPool(
      ASMR_POOLS[material].impacts,
      `${material}_imp`,
    );
    const sound = await this.getAsmrSound(asset);
    if (!sound) return;
    try {
      await sound.setVolumeAsync(effectVolume());
      await sound.replayAsync();
    } catch {
      /* ignore */
    }
  }

  /**
   * ASMR 접촉 루프 시작 — 누르고 문지르는 동안 단일 사운드를 반복 재생해 끊김 없이 이어준다.
   * 재질 루프 풀에서 랜덤 선택(같은 루프가 재생 중이면 볼륨만 갱신).
   */
  async startLoop(material: AsmrMaterial, volume = 1): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const vol = Math.max(0, Math.min(1, effectVolume() * volume));
    const asset = this.pickFromPool(
      ASMR_POOLS[material].loops,
      `${material}_loop`,
    );
    if (this.loopAsset === asset && this.loopSound) {
      try {
        await this.loopSound.setStatusAsync({ shouldPlay: true, volume: vol });
      } catch {
        /* ignore */
      }
      return;
    }
    await this.stopLoop();
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        isLooping: true,
        volume: vol,
      });
      this.loopSound = sound;
      this.loopAsset = asset;
      await sound.playAsync();
    } catch (e) {
      console.warn('Failed to start ASMR loop', e);
    }
  }

  /** 접촉 루프 볼륨 변조 (문지르는 속도/세기에 비례) */
  async setLoopVolume(volume: number): Promise<void> {
    if (!this.loopSound) return;
    try {
      await this.loopSound.setVolumeAsync(
        Math.max(0, Math.min(1, effectVolume() * volume)),
      );
    } catch {
      /* ignore */
    }
  }

  /** 접촉 루프 종료 (손을 뗄 때) */
  async stopLoop(): Promise<void> {
    const s = this.loopSound;
    this.loopSound = null;
    this.loopAsset = null;
    if (s) {
      try {
        await s.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await s.unloadAsync();
      } catch {
        /* ignore */
      }
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
   * 최고음에서는 클램프해 음이 아래로 꺾이지 않게 한다 (상승감 유지).
   * 자산 자체에 마림바 배음 + 물 텍스처가 합성되어 있다 (T102).
   */
  async playPour(colorId: number, chainCount = 0): Promise<void> {
    const shift = Math.min(chainCount, POUR_CHAIN_SHIFT_MAX);
    const note = Math.min(
      (colorId % POUR_NOTE_COUNT) + shift,
      POUR_NOTE_COUNT - 1,
    );
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
    for (const s of this.asmrSounds.values()) {
      try {
        await s.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.asmrSounds.clear();
    this.lastPick.clear();
    await this.stopBGM();
    await this.stopLoop();
    this.loaded = false;
  }
}

export const SoundManager = new SoundManagerClass();
