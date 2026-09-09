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
const LOOP_VOLUME_INTERVAL_MS = 50;
const LOOP_VOLUME_MIN_CHANGE = 0.02;
const MAX_ASMR_VOICES = 3;

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
  private bgmToken = 0;
  private loaded = false;
  private generation = 0;
  private preloadTask: Promise<void> | null = null;
  private asmrPreloadToken = 0;

  private loopSound: Audio.Sound | null = null;
  private loopToken = 0;
  private loopTargetVolume = 0;
  private loopGain = 0;
  private loopVolumeTimer: ReturnType<typeof setTimeout> | null = null;
  private loopVolumeTask: Promise<void> | null = null;
  private lastLoopVolume = -1;
  private asmrSounds: Map<number, Audio.Sound> = new Map();
  private impactVoices: Audio.Sound[] = [];
  private loopSounds: Map<number, Audio.Sound> = new Map();
  private asmrLoads = new Map<number, Promise<Audio.Sound | null>>();
  private loopLoads = new Map<number, Promise<Audio.Sound | null>>();
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
    if (this.preloadTask) return this.preloadTask;
    const generation = this.generation;
    const task = this.loadEffects(generation);
    this.preloadTask = task;
    try {
      await task;
    } finally {
      if (this.preloadTask === task) this.preloadTask = null;
    }
  }

  private async loadEffects(generation: number): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
        if (generation !== this.generation) return;
        if (this.sounds.has(key as SoundKey)) continue;
        const { sound } = await Audio.Sound.createAsync(asset, {
          volume: effectVolume(),
        });
        if (generation !== this.generation) {
          await sound.unloadAsync().catch(() => undefined);
          return;
        }
        this.sounds.set(key as SoundKey, sound);
      }
      this.loaded = true;
    } catch (error) {
      console.warn('Failed to preload sound effects', error);
    }
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

  private getCachedSound(asset: number, looping: boolean): Promise<Audio.Sound | null> {
    const cache = looping ? this.loopSounds : this.asmrSounds;
    const pending = looping ? this.loopLoads : this.asmrLoads;
    const cached = cache.get(asset);
    if (cached) return Promise.resolve(cached);
    const loading = pending.get(asset);
    if (loading) return loading;
    const generation = this.generation;
    const task = this.loadAsmrSound(asset, looping, generation).finally(() => {
      if (pending.get(asset) === task) pending.delete(asset);
    });
    pending.set(asset, task);
    return task;
  }

  private async loadAsmrSound(
    asset: number,
    looping: boolean,
    generation: number,
  ): Promise<Audio.Sound | null> {
    const cache = looping ? this.loopSounds : this.asmrSounds;
    const cached = cache.get(asset);
    if (cached) return cached;
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        isLooping: looping,
        shouldPlay: false,
        volume: looping ? 0 : effectVolume(),
      });
      if (generation !== this.generation) {
        await sound.unloadAsync().catch(() => undefined);
        return null;
      }
      cache.set(asset, sound);
      return sound;
    } catch (error) {
      console.warn('Failed to load ASMR sound', error);
      return null;
    }
  }

  async preloadAsmr(material: AsmrMaterial = 'slime'): Promise<void> {
    const token = ++this.asmrPreloadToken;
    const generation = this.generation;
    const pool = ASMR_POOLS[material];
    // 재질 하나씩 준비하고 루프를 먼저 로드해 첫 접촉 지연을 줄인다.
    for (const looping of [true, false]) {
      for (const asset of new Set(looping ? pool.loops : pool.impacts)) {
        if (token !== this.asmrPreloadToken || generation !== this.generation) return;
        await this.getCachedSound(asset, looping);
      }
    }
  }

  async playImpact(material: AsmrMaterial, gain = 1): Promise<void> {
    if (!useSettingsStore.getState().soundEnabled) return;
    const asset = this.pickFromPool(ASMR_POOLS[material].impacts, `${material}_imp`);
    const generation = this.generation;
    const interaction = this.loopToken;
    const sound = await this.getCachedSound(asset, false);
    if (
      !sound ||
      generation !== this.generation ||
      interaction !== this.loopToken ||
      !useSettingsStore.getState().soundEnabled
    )
      return;
    try {
      this.impactVoices = this.impactVoices.filter((voice) => voice !== sound);
      if (this.impactVoices.length >= MAX_ASMR_VOICES)
        void this.impactVoices
          .shift()
          ?.stopAsync()
          .catch(() => undefined);
      this.impactVoices.push(sound);
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
    this.cancelLoopVolumeUpdate();
    this.loopGain = clamp01(volume);
    const targetVolume = clamp01(effectVolume() * this.loopGain);
    const asset = this.pickFromPool(ASMR_POOLS[material].loops, `${material}_loop`);
    const sound = await this.getCachedSound(asset, true);
    if (token !== this.loopToken || !sound) return;

    let positionMillis = 0;
    let currentVolume = 0;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        currentVolume = typeof status.volume === 'number' ? status.volume : 0;
        if (status.durationMillis && status.durationMillis > 300) {
          positionMillis = Math.floor(Math.random() * (status.durationMillis - 200));
        }
      }
      if (token !== this.loopToken || !useSettingsStore.getState().soundEnabled) return;
      const previous = this.loopSound;
      this.loopSound = sound;
      this.loopTargetVolume = targetVolume;
      this.lastLoopVolume = targetVolume;
      if (previous && previous !== sound) void this.fadeOutDetached(previous);
      await sound.setStatusAsync({
        shouldPlay: true,
        isLooping: true,
        positionMillis,
        volume: Math.min(currentVolume, targetVolume),
      });
    } catch {
      return;
    }

    await this.fadeSound(
      sound,
      Math.min(currentVolume, targetVolume),
      targetVolume,
      ASMR_FADE_IN_MS,
      () =>
        token === this.loopToken &&
        this.loopSound === sound &&
        this.loopTargetVolume === targetVolume,
    );
  }

  async setLoopVolume(volume: number): Promise<void> {
    if (!this.loopSound) return;
    this.loopGain = clamp01(volume);
    this.loopTargetVolume = clamp01(effectVolume() * this.loopGain);
    this.scheduleLoopVolumeUpdate();
  }

  private cancelLoopVolumeUpdate(): void {
    if (this.loopVolumeTimer) clearTimeout(this.loopVolumeTimer);
    this.loopVolumeTimer = null;
  }

  private scheduleLoopVolumeUpdate(): void {
    if (!this.loopSound || this.loopVolumeTimer || this.loopVolumeTask) return;
    if (Math.abs(this.loopTargetVolume - this.lastLoopVolume) < LOOP_VOLUME_MIN_CHANGE) return;
    this.loopVolumeTimer = setTimeout(() => {
      this.loopVolumeTimer = null;
      const task = this.flushLoopVolume();
      this.loopVolumeTask = task;
      void task.finally(() => {
        if (this.loopVolumeTask === task) this.loopVolumeTask = null;
        this.scheduleLoopVolumeUpdate();
      });
    }, LOOP_VOLUME_INTERVAL_MS);
  }

  private async flushLoopVolume(): Promise<void> {
    const sound = this.loopSound;
    if (!sound) return;
    const target = this.loopTargetVolume;
    this.lastLoopVolume = target;
    try {
      await sound.setVolumeAsync(target);
    } catch {
      // 제스처 중 볼륨 한 프레임 누락은 무시한다.
    }
  }

  /** 손을 떼면 즉시 자르지 않고 짧은 꼬리를 남긴 뒤 일시정지한다. */
  async stopLoop(): Promise<void> {
    this.loopToken += 1;
    this.cancelLoopVolumeUpdate();
    const sound = this.loopSound;
    this.loopSound = null;
    this.loopTargetVolume = 0;
    this.loopGain = 0;
    if (sound) await this.fadeOutDetached(sound);
  }

  /** End a material/session without leaving impact tails or asset work behind. */
  async stopAsmr(): Promise<void> {
    this.asmrPreloadToken += 1;
    const voices = this.impactVoices.splice(0);
    await Promise.all([
      this.stopLoop(),
      ...voices.map((sound) => sound.stopAsync().catch(() => undefined)),
    ]);
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
      await this.loopSound.setVolumeAsync(this.loopTargetVolume).catch(() => undefined);
    }
  }

  async playPour(colorId: number, chainCount = 0, layerCount = 1): Promise<void> {
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
    const note = Math.min(POUR_NOTE_COUNT - 1, base + Math.max(0, index));
    await this.play(`pour_${note}` as SoundKey);
  }

  async playBGM(track: 'zen' | 'classic'): Promise<void> {
    if (!useSettingsStore.getState().bgmEnabled) return;
    const token = ++this.bgmToken;
    this.bgmFadeToken += 1;

    if (this.bgm) {
      const previous = this.bgm;
      this.bgm = null;
      try {
        await previous.unloadAsync();
      } catch {
        // 이미 해제된 경우 무시한다.
      }
    }

    if (token !== this.bgmToken) return;
    let created: Audio.Sound | null = null;
    try {
      const { sound } = await Audio.Sound.createAsync(BGM_ASSETS[track], {
        isLooping: true,
        shouldPlay: false,
        volume: this.currentBgmVolume(),
      });
      if (token !== this.bgmToken || !useSettingsStore.getState().bgmEnabled) {
        await sound.unloadAsync().catch(() => undefined);
        return;
      }
      created = sound;
      this.bgm = sound;
      await sound.playAsync();
    } catch (error) {
      if (created && this.bgm === created) {
        this.bgm = null;
        await created.unloadAsync().catch(() => undefined);
      }
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
    this.bgmToken += 1;
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
    // 먼저 소유권을 끊어 늦게 끝난 로드가 해제된 캐시에 되살아나지 않게 한다.
    this.generation += 1;
    this.asmrPreloadToken += 1;
    this.loopToken += 1;
    this.cancelLoopVolumeUpdate();
    this.loopSound = null;
    this.loopTargetVolume = 0;
    this.loopGain = 0;
    this.lastLoopVolume = -1;
    this.loaded = false;
    this.preloadTask = null;
    const sounds = new Set([
      ...this.sounds.values(),
      ...this.asmrSounds.values(),
      ...this.loopSounds.values(),
    ]);
    this.sounds.clear();
    this.asmrSounds.clear();
    this.impactVoices = [];
    this.loopSounds.clear();
    this.asmrLoads.clear();
    this.loopLoads.clear();
    this.lastPick.clear();
    const stopBgm = this.stopBGM();
    for (const sound of sounds) {
      await sound.unloadAsync().catch(() => undefined);
    }
    await stopBgm;
  }
}

export const SoundManager = new SoundManagerClass();
