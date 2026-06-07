import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      soundEnabled: true,
      bgmEnabled: true,
      hapticEnabled: true,
      theme: 'pastel',
      language: 'ko',
    });
  });

  test('초기 사운드는 활성화', () => {
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  test('toggleSound는 사운드를 토글한다', () => {
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  test('toggleBgm은 BGM을 토글한다', () => {
    useSettingsStore.getState().toggleBgm();
    expect(useSettingsStore.getState().bgmEnabled).toBe(false);
  });

  test('toggleHaptic은 햅틱을 토글한다', () => {
    useSettingsStore.getState().toggleHaptic();
    expect(useSettingsStore.getState().hapticEnabled).toBe(false);
  });

  test('setTheme은 테마를 변경한다', () => {
    useSettingsStore.getState().setTheme('neon');
    expect(useSettingsStore.getState().theme).toBe('neon');
  });

  test('setLanguage는 언어를 변경한다', () => {
    useSettingsStore.getState().setLanguage('en');
    expect(useSettingsStore.getState().language).toBe('en');
  });

  test('볼륨 세터는 값을 변경한다', () => {
    useSettingsStore.getState().setMasterVolume(0.6);
    useSettingsStore.getState().setSfxVolume(0.4);
    useSettingsStore.getState().setBgmVolume(0.2);
    const s = useSettingsStore.getState();
    expect(s.masterVolume).toBeCloseTo(0.6);
    expect(s.sfxVolume).toBeCloseTo(0.4);
    expect(s.bgmVolume).toBeCloseTo(0.2);
  });

  test('볼륨은 0~1 범위로 클램프된다', () => {
    useSettingsStore.getState().setMasterVolume(2);
    expect(useSettingsStore.getState().masterVolume).toBe(1);
    useSettingsStore.getState().setSfxVolume(-1);
    expect(useSettingsStore.getState().sfxVolume).toBe(0);
  });
});
