import { Audio } from 'expo-av';
import { SoundManager } from '../SoundManager';
import { useSettingsStore } from '../../store/settingsStore';

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: { createAsync: jest.fn() },
  },
}));
jest.mock('../asmrPools', () => ({
  ASMR_POOLS: {
    water: { impacts: [101, 102], loops: [103] },
    slime: { impacts: [201, 202], loops: [203] },
    sponge: { impacts: [301], loops: [302] },
    handcream: { impacts: [401], loops: [402] },
    shaving: { impacts: [501], loops: [502] },
  },
}));
jest.mock('../assets/pour_c4.wav', () => 1);
jest.mock('../assets/pour_d4.wav', () => 2);
jest.mock('../assets/pour_e4.wav', () => 3);
jest.mock('../assets/pour_f4.wav', () => 4);
jest.mock('../assets/pour_g4.wav', () => 5);
jest.mock('../assets/pour_a4.wav', () => 6);
jest.mock('../assets/pour_b4.wav', () => 7);
jest.mock('../assets/pour_c5.wav', () => 8);
jest.mock('../assets/pour_d5.wav', () => 9);
jest.mock('../assets/pour_e5.wav', () => 10);
jest.mock('../assets/pour_f5.wav', () => 11);
jest.mock('../assets/pour_g5.wav', () => 12);
jest.mock('../assets/tube_select.wav', () => 13);
jest.mock('../assets/tube_deselect.wav', () => 14);
jest.mock('../assets/complete_tube.wav', () => 15);
jest.mock('../assets/level_clear.wav', () => 16);
jest.mock('../assets/coin.wav', () => 17);
jest.mock('../assets/button_tap.wav', () => 18);
jest.mock('../assets/bgm_zen.mp3', () => 21);
jest.mock('../assets/bgm_classic.mp3', () => 22);

function makeSound() {
  return {
    playAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    replayAsync: jest.fn().mockResolvedValue(undefined),
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
    setStatusAsync: jest.fn().mockResolvedValue(undefined),
    getStatusAsync: jest.fn().mockResolvedValue({
      isLoaded: true,
      volume: 0,
      durationMillis: 1000,
    }),
  };
}

function created(sound = makeSound()) {
  return {
    sound: sound as unknown as Audio.Sound,
    status: { isLoaded: false as const },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

const createAsync = jest.mocked(Audio.Sound.createAsync);

beforeEach(async () => {
  await SoundManager.unloadAll();
  jest.clearAllMocks();
  createAsync.mockReset().mockImplementation(async () => created());
  useSettingsStore.setState({
    soundEnabled: true,
    bgmEnabled: true,
    masterVolume: 1,
    sfxVolume: 0.8,
    bgmVolume: 0.5,
  });
});

afterEach(async () => {
  await SoundManager.unloadAll();
  jest.useRealTimers();
});

test('leaving a screen while BGM loads never starts late music', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  const sound = makeSound();
  createAsync.mockReturnValueOnce(pending.promise);
  const playing = SoundManager.playBGM('zen');
  await SoundManager.stopBGM();
  pending.resolve(created(sound));
  await playing;
  expect(sound.playAsync).not.toHaveBeenCalled();
  expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
});

test('rapid track changes keep only the latest BGM even if loads finish backwards', async () => {
  const first = deferred<ReturnType<typeof created>>();
  const oldSound = makeSound();
  const currentSound = makeSound();
  createAsync.mockReturnValueOnce(first.promise).mockResolvedValueOnce(created(currentSound));
  const oldTrack = SoundManager.playBGM('zen');
  await SoundManager.playBGM('classic');
  first.resolve(created(oldSound));
  await oldTrack;
  expect(oldSound.playAsync).not.toHaveBeenCalled();
  expect(oldSound.unloadAsync).toHaveBeenCalledTimes(1);
  expect(currentSound.playAsync).toHaveBeenCalledTimes(1);
  await SoundManager.stopBGM();
  expect(currentSound.unloadAsync).toHaveBeenCalledTimes(1);
});

test('duplicate app preload calls share their audio creation work', async () => {
  await Promise.all([SoundManager.preload(), SoundManager.preload()]);
  expect(Audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
  expect(createAsync).toHaveBeenCalledTimes(18);
});

test('effect creation finishing after teardown is discarded and a new preload still works', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  const staleSound = makeSound();
  createAsync.mockReturnValueOnce(pending.promise);
  const loading = SoundManager.preload();
  await Promise.resolve();
  await SoundManager.unloadAll();
  pending.resolve(created(staleSound));
  await loading;
  await SoundManager.playPour(0);
  expect(staleSound.replayAsync).not.toHaveBeenCalled();
  expect(staleSound.unloadAsync).toHaveBeenCalledTimes(1);
  await SoundManager.preload();
  expect(createAsync).toHaveBeenCalledTimes(19);
});

test('concurrent gestures share one in-flight ASMR asset', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  const sound = makeSound();
  createAsync.mockReturnValueOnce(pending.promise);
  const first = SoundManager.playImpact('sponge');
  const second = SoundManager.playImpact('sponge');
  expect(createAsync).toHaveBeenCalledTimes(1);
  pending.resolve(created(sound));
  await Promise.all([first, second]);
  expect(sound.replayAsync).toHaveBeenCalledTimes(2);
});

test('ASMR teardown invalidates loads and permits a fresh load of the same asset', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  const sound = makeSound();
  createAsync.mockReturnValueOnce(pending.promise);
  const impact = SoundManager.playImpact('sponge');
  await SoundManager.unloadAll();
  pending.resolve(created(sound));
  await impact;
  expect(sound.replayAsync).not.toHaveBeenCalled();
  expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
  await SoundManager.playImpact('sponge');
  expect(createAsync).toHaveBeenCalledTimes(2);
});

test('release cancels a delayed contact impact while preserving the release sound', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  const sound = makeSound();
  createAsync.mockReturnValueOnce(pending.promise);
  const contact = SoundManager.playImpact('sponge');
  await SoundManager.stopLoop();
  const release = SoundManager.playImpact('sponge', 0.24);
  pending.resolve(created(sound));
  await Promise.all([contact, release]);
  expect(sound.replayAsync).toHaveBeenCalledTimes(1);
  expect(sound.replayAsync).toHaveBeenCalledWith({ volume: 0.192 });
});

test('material preload warms only its own assets and starts one native load at a time', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  createAsync.mockReturnValueOnce(pending.promise);
  const warming = SoundManager.preloadAsmr('water');
  expect(createAsync).toHaveBeenCalledTimes(1);
  expect(createAsync.mock.calls[0][0]).toBe(103);
  pending.resolve(created());
  await warming;
  expect(createAsync.mock.calls.map(([asset]) => asset)).toEqual([103, 101, 102]);
});

test('changing material cancels remaining work from the previous preload', async () => {
  const pending = deferred<ReturnType<typeof created>>();
  createAsync.mockReturnValueOnce(pending.promise);
  const oldMaterial = SoundManager.preloadAsmr('water');
  await SoundManager.preloadAsmr('slime');
  pending.resolve(created());
  await oldMaterial;
  expect(createAsync.mock.calls.map(([asset]) => asset)).toEqual([103, 203, 201, 202]);
});

test('releasing a gesture during loop status lookup cannot start a detached loop', async () => {
  const status = deferred<{ isLoaded: true; volume: number; durationMillis: number }>();
  const sound = makeSound();
  sound.getStatusAsync.mockReturnValueOnce(status.promise);
  createAsync.mockResolvedValueOnce(created(sound));
  const starting = SoundManager.startLoop('sponge');
  for (let step = 0; step < 5; step++) await Promise.resolve();
  expect(sound.getStatusAsync).toHaveBeenCalledTimes(1);
  await SoundManager.stopLoop();
  status.resolve({ isLoaded: true, volume: 0, durationMillis: 1000 });
  await starting;
  expect(sound.setStatusAsync).not.toHaveBeenCalled();
});

test('gesture volume bursts coalesce and pending updates stop on release', async () => {
  jest.useFakeTimers();
  const sound = makeSound();
  createAsync.mockResolvedValueOnce(created(sound));
  const starting = SoundManager.startLoop('sponge');
  await jest.runAllTimersAsync();
  await starting;
  sound.setVolumeAsync.mockClear();
  await Promise.all([0.2, 0.4, 0.6].map((volume) => SoundManager.setLoopVolume(volume)));
  expect(sound.setVolumeAsync).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(50);
  expect(sound.setVolumeAsync).toHaveBeenCalledTimes(1);
  expect(sound.setVolumeAsync).toHaveBeenCalledWith(0.48);
  await SoundManager.setLoopVolume(0.61);
  await jest.advanceTimersByTimeAsync(100);
  expect(sound.setVolumeAsync).toHaveBeenCalledTimes(1);
  await SoundManager.setLoopVolume(1);
  const stopping = SoundManager.stopLoop();
  await jest.runAllTimersAsync();
  await stopping;
  expect(sound.setVolumeAsync).not.toHaveBeenCalledWith(0.8);
  expect(sound.setStatusAsync).toHaveBeenLastCalledWith({ shouldPlay: false, volume: 0 });
});

test('fast ASMR impacts keep at most three voices and session exit stops the remaining tails', async () => {
  const voices = [makeSound(), makeSound(), makeSound(), makeSound()];
  voices.forEach((voice) => createAsync.mockResolvedValueOnce(created(voice)));
  for (const material of ['water', 'slime', 'sponge', 'handcream'] as const)
    await SoundManager.playImpact(material);
  expect(voices[0].stopAsync).toHaveBeenCalledTimes(1);
  expect(voices.slice(1).every((voice) => voice.stopAsync.mock.calls.length === 0)).toBe(true);
  await SoundManager.stopAsmr();
  voices.forEach((voice) => expect(voice.stopAsync).toHaveBeenCalledTimes(1));
});

test('leaving ASMR cancels pending impacts and stops the rest of the material preload', async () => {
  const loadingLoop = deferred<ReturnType<typeof created>>();
  const loadingImpact = deferred<ReturnType<typeof created>>();
  const impactVoice = makeSound();
  createAsync.mockReturnValueOnce(loadingLoop.promise).mockReturnValueOnce(loadingImpact.promise);
  const warming = SoundManager.preloadAsmr('water');
  const playing = SoundManager.playImpact('sponge');
  await SoundManager.stopAsmr();
  loadingLoop.resolve(created());
  loadingImpact.resolve(created(impactVoice));
  await Promise.all([warming, playing]);
  expect(createAsync).toHaveBeenCalledTimes(2);
  expect(impactVoice.replayAsync).not.toHaveBeenCalled();
  await SoundManager.playImpact('sponge');
  expect(impactVoice.replayAsync).toHaveBeenCalledTimes(1);
});
