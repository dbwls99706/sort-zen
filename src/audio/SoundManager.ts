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
  | 'button_tap';

const SOUND_VOLUME = 0.7;
const BGM_VOLUME = 0.3;

/* eslint-disable @typescript-eslint/no-require-imports */
const SOUND_ASSETS: Record<SoundKey, number> = {
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
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: SOUND_VOLUME,
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
      /* 사운드 재생 실패 무시 */
    }
  }

  async playPour(colorId: number): Promise<void> {
    const key = `pour_${colorId % 12}` as SoundKey;
    await this.play(key);
  }

  async playBGM(track: 'zen' | 'classic'): Promise<void> {
    if (!useSettingsStore.getState().bgmEnabled) return;

    if (this.bgm) {
      await this.bgm.unloadAsync();
      this.bgm = null;
    }

    const asset = BGM_ASSETS[track];
    const { sound } = await Audio.Sound.createAsync(asset, {
      isLooping: true,
      volume: BGM_VOLUME,
    });
    this.bgm = sound;
    await sound.playAsync();
  }

  async stopBGM(): Promise<void> {
    if (this.bgm) {
      await this.bgm.stopAsync();
      await this.bgm.unloadAsync();
      this.bgm = null;
    }
  }

  async unloadAll(): Promise<void> {
    for (const s of this.sounds.values()) {
      await s.unloadAsync();
    }
    this.sounds.clear();
    await this.stopBGM();
    this.loaded = false;
  }
}

export const SoundManager = new SoundManagerClass();
