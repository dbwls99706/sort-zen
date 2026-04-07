import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

export const Haptic = {
  light: (): void => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: (): void => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavy: (): void => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  success: (): void => {
    if (!useSettingsStore.getState().hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
