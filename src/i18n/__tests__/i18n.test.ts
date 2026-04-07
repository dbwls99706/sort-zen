import { t } from '../index';
import { useSettingsStore } from '../../store/settingsStore';

describe('i18n', () => {
  test('한국어 번역을 반환한다', () => {
    useSettingsStore.setState({ language: 'ko' });
    expect(t('app_name')).toBe('Sort ZEN');
    expect(t('classic')).toBe('클래식');
  });

  test('영어 번역을 반환한다', () => {
    useSettingsStore.setState({ language: 'en' });
    expect(t('classic')).toBe('Classic');
    expect(t('settings')).toBe('Settings');
  });

  test('없는 키는 키 자체를 반환한다', () => {
    useSettingsStore.setState({ language: 'ko' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(t('nonexistent_key' as any)).toBe('nonexistent_key');
  });
});
