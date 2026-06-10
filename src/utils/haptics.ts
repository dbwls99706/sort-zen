import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

/** 흐름 햅틱의 틱 간격 — 액체가 졸졸 흐르는 촉감 (docs/02-audio.md) */
const FLOW_TICK_INTERVAL_MS = 90;

export const Haptic = {
  light: (): void => {
    if (Platform.OS === 'web') return;
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: (): void => {
    if (Platform.OS === 'web') return;
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy: (): void => {
    if (Platform.OS === 'web') return;
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success: (): void => {
    if (Platform.OS === 'web') return;
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /**
   * 액체가 흐르는 동안 가벼운 틱을 반복해 '물 흐름' 촉감을 만든다.
   * durationMs가 지나면 스스로 멈추며, 반환된 함수로 조기 중단할 수 있다.
   */
  flow: (durationMs: number): (() => void) => {
    if (Platform.OS === 'web') return () => {};
    if (!useSettingsStore.getState().hapticEnabled) return () => {};
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, FLOW_TICK_INTERVAL_MS);
    const timeout = setTimeout(() => clearInterval(interval), durationMs);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  },
};
