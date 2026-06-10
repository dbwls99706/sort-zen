import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

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
};
