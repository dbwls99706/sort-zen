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

const POUR_NOTE_COUNT = 12;
const POUR_CHAIN_SHIFT_MAX = 2;
const ASMR_FADE_IN_MS = 110;
const ASMR_FADE_OUT_MS = 150;
const ASMR_BGM_DUCK = 0.48;

function effectVolume(): number {
  const { masterVolume, sfxVolume } = useSettingsStore.getState();
  return masterVolume * sfxVolume;
}

function baseBgmVolume(): number {
  const { masterVolume, bgmVolume } = useSettingsStore.getState();
  return masterVolume * bgmVolume;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  private bgmDuck = 1;
  private bgmFadeToken = 0;
  private loaded = false;

  private loopSound: Audio.Sound | null = null;
  private loopToken = 0;
  private loopTargetVolume = 0;
  private loopGain = 0;
  private asmrSounds: Map<number, Audio.Sound> = new Map();
  private loopSounds: Map<number, Audio.Sound> = new Map();
  private lastPick: Map<string, number> = new Map();

  private currentBgmVolume(): number {
    return clamp01(baseBgmVolume() * this.bgmDuck);
  }

  private async fadeSound(
    sound: Audio.Sound,
    from: number,
    to: number,
    durationMs: number,
    shouldContinue?: () => boolean,
  ): Promise<boolean> {
    const steps = Math.max(3, Math.round(durationMs / 28));
    for (let step = 1; step <= steps; step++) {
      await wait(durationMs / steps);
      if (shouldContinue && !shouldContinue()) return false;
      const value = from + (to - from) * (step / steps);
      try {
        await sound.setVolumeAsync(clamp01(value));
      } catch {
        return false;
      }
    }
    return true;
  }

  private async fadeOutDetached(sound: Audio.Sound): Promise<void> {
    let from = this.loopTargetVolume;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && typeof status.volume === 'number') {
        from = status.volume;
      }
    } catch {
      // 현재 볼륨을 못 읽으면 마지막 목표 볼륨에서 감쇠한다.
    }

    const finished = await this.fadeSound(
      sound,
      from,
      0,
      ASMR_FADE_OUT_MS,
      () => this.loopSound !== sound,
    );
    if (!finished || this.loopSound === sound) return;
    try {
      await sound.setStatusAsync({ shouldPlay: false, volume: 0 });
    } catch {
      // 이미 해제되었거나 플랫폼이 상태 변경을 거절한 경우 무시한다.
    }
  }

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
      await sound.replayAsync({ volume: effectVolume() });
    } catch {
      // 효과음 하나의 실패가 게임 입력을 막아서는 안 된다.
    }
  }

  private pickFromPool(pool: number[], tag: string): number {
    if (pool.length <= 1) return pool[0];
    let index = Math.floor(Math.random() * pool.length);
    if (index === this.lastPick.get(tag)) index = (index + 1) % pool.length;
    this.lastPick.set(tag, index);
    return pool[index];
  }

  private async getAsmrSound(asset: number): Promise<Audio.Sound | null> {
    const cached = this.asmrSounds.get(asset);
    if (cached) return cached;
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: effectVolume(),
      });
      this.asmrSounds.set(asset, sound);
      return sound;
    } catch (error) {
      console.warn('Failed to load ASMR sound', error);
      return null;
    }
  }

  private async getLoopSound(asset: number): Promise<Audio.Sound | null> {
    const cached = this.loopSounds.get(asset);
    if (cached) return cached;
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        isLooping: true,
        shouldPlay: false,
        volume: 0,
      });
      this.loopSounds.set(asset, sound);
      return sound;
    } catch (error) {
      console.warn('Failed to load ASMR loop', error);
      return null;
    }
  }

  async preloadAsmr(): Promise<void> {
    const impacts = new Set<number>();
    const loops = new Set<number>();
    for (const material of Object.keys(ASMR_POOLS) as AsmrMaterial[]) {
      for (const asset of ASMR_POOLS[material].impacts) impacts.add(asset);
      for (const asset of ASMR_POOLS[material].loops) loops.add(asset);
    }
    await Promise.all([
      ...[...impacts].map((asset) =>
        this.getAsmrSound(asset).then(() => undefined),
      ),
      ...[...loops].map((asset) =>
        this.getLoopSound(asset).then(() => undefined),
      ),
    ]);
  }

  async playImpact(material: AsmrMaterial, gain = 1): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const asset = this.pickFromPool(
      ASMR_POOLS[material].impacts,
      `${material}_imp`,
    );
    const sound = await this.getAsmrSound(asset);
    if (!sound) return;
    try {
      await sound.replayAsync({
        volume: clamp01(effectVolume() * gain),
      });
    } catch {
      // 원샷 중첩 실패는 다음 제스처에서 자연스럽게 복구된다.
    }
  }

  /** 접촉 시작 시 랜덤 위치에서 루프를 시작하고 짧게 페이드인한다. */
  async startLoop(material: AsmrMaterial, volume = 1): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const token = ++this.loopToken;
    this.loopGain = clamp01(volume);
    const targetVolume = clamp01(effectVolume() * this.loopGain);
    const asset = this.pickFromPool(
      ASMR_POOLS[material].loops,
      `${material}_loop`,
    );
    const sound = await this.getLoopSound(asset);
    if (token !== this.loopToken || !sound) return;

    const previous = this.loopSound;
    this.loopSound = sound;
    this.loopTargetVolume = targetVolume;

    let positionMillis = 0;
    let currentVolume = 0;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        currentVolume =
          typeof status.volume === 'number' ? status.volume : 0;
        if (status.durationMillis && status.durationMillis > 300) {
          positionMillis = Math.floor(
            Math.random() * (status.durationMillis - 200),
          );
        }
      }
      await sound.setStatusAsync({
        shouldPlay: true,
        isLooping: true,
        positionMillis,
        volume: Math.min(currentVolume, targetVolume),
      });
    } catch {
      return;
    }

    if (previous && previous !== sound) void this.fadeOutDetached(previous);
    await this.fadeSound(
      sound,
      Math.min(currentVolume, targetVolume),
      targetVolume,
      ASMR_FADE_IN_MS,
      () => token === this.loopToken && this.loopSound === sound,
    );
  }

  async setLoopVolume(volume: number): Promise<void> {
    const sound = this.loopSound;
    if (!sound) return;
    this.loopGain = clamp01(volume);
    const target = clamp01(effectVolume() * this.loopGain);
    this.loopTargetVolume = target;
    try {
      await sound.setVolumeAsync(target);
    } catch {
      // 제스처 중 볼륨 한 프레임 누락은 무시한다.
    }
  }

  /** 손을 떼면 즉시 자르지 않고 짧은 꼬리를 남긴 뒤 일시정지한다. */
  async stopLoop(): Promise<void> {
    this.loopToken += 1;
    const sound = this.loopSound;
    this.loopSound = null;
    this.loopTargetVolume = 0;
    this.loopGain = 0;
    if (sound) await this.fadeOutDetached(sound);
  }

  /** ASMR 접촉 중 BGM을 낮춰 미세한 재질음을 앞으로 가져온다. */
  async setBgmDucked(ducked: boolean): Promise<void> {
    this.bgmDuck = ducked ? ASMR_BGM_DUCK : 1;
    const sound = this.bgm;
    if (!sound) return;
    const token = ++this.bgmFadeToken;
    let from = this.currentBgmVolume();
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && typeof status.volume === 'number') {
        from = status.volume;
      }
    } catch {
      // 목표값으로 바로 접근한다.
    }
    await this.fadeSound(
      sound,
      from,
      this.currentBgmVolume(),
      ducked ? 120 : 220,
      () => token === this.bgmFadeToken && this.bgm === sound,
    );
  }

  async refreshSfxVolume(): Promise<void> {
    const volume = effectVolume();
    await Promise.all([
      ...[...this.sounds.values()].map((sound) =>
        sound.setVolumeAsync(volume).catch(() => undefined),
      ),
      ...[...this.asmrSounds.values()].map((sound) =>
        sound.setVolumeAsync(volume).catch(() => undefined),
      ),
    ]);
    if (this.loopSound) {
      this.loopTargetVolume = clamp01(volume * this.loopGain);
      await this.loopSound
        .setVolumeAsync(this.loopTargetVolume)
        .catch(() => undefined);
    }
  }

  async playPour(
    colorId: number,
    chainCount = 0,
    layerCount = 1,
  ): Promise<void> {
    const chainShift = Math.min(chainCount, POUR_CHAIN_SHIFT_MAX);
    const weightShift = layerCount >= 3 ? 1 : 0;
    const note = Math.min(
      (colorId % POUR_NOTE_COUNT) + chainShift + weightShift,
      POUR_NOTE_COUNT - 1,
    );
    await this.play(`pour_${note}` as SoundKey);
  }

  /** 결과 별이 하나씩 등장할 때 서로 다른 고음으로 상승감을 만든다. */
  async playCelebrationNote(index: number, stars: number): Promise<void> {
    const base = stars === 3 ? 8 : 7;
    const note = Math.min(
      POUR_NOTE_COUNT - 1,
      base + Math.max(0, index),
    );
    await this.play(`pour_${note}` as SoundKey);
  }

  async playBGM(track: 'zen' | 'classic'): Promise<void> {
    if (!useSettingsStore.getState().bgmEnabled) return;

    if (this.bgm) {
      const previous = this.bgm;
      this.bgm = null;
      try {
        await previous.unloadAsync();
      } catch {
        // 이미 해제된 경우 무시한다.
      }
    }

    try {
      const { sound } = await Audio.Sound.createAsync(BGM_ASSETS[track], {
        isLooping: true,
        volume: this.currentBgmVolume(),
      });
      this.bgm = sound;
      await sound.playAsync();
    } catch (error) {
      console.warn('Failed to play BGM', error);
    }
  }

  async refreshBgmVolume(): Promise<void> {
    if (!this.bgm) return;
    try {
      await this.bgm.setVolumeAsync(this.currentBgmVolume());
    } catch {
      // 설정 화면을 막지 않는다.
    }
  }

  async stopBGM(): Promise<void> {
    const sound = this.bgm;
    this.bgm = null;
    this.bgmDuck = 1;
    this.bgmFadeToken += 1;
    if (!sound) return;
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

  async unloadAll(): Promise<void> {
    for (const sound of this.sounds.values()) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.sounds.clear();

    for (const sound of this.asmrSounds.values()) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.asmrSounds.clear();

    await this.stopLoop();
    for (const sound of this.loopSounds.values()) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.loopSounds.clear();
    this.lastPick.clear();
    await this.stopBGM();
    this.loaded = false;
  }
}

export const SoundManager = new SoundManagerClass();
