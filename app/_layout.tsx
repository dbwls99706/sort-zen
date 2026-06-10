import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { AdManager } from '../src/ads/AdManager';
import { SoundManager } from '../src/audio/SoundManager';
import { SubscriptionManager } from '../src/iap/SubscriptionManager';
import { useUserStore } from '../src/store/userStore';

const PLAY_TIME_TICK_MS = 10000;

export default function RootLayout() {
  useEffect(() => {
    AdManager.init();
    SubscriptionManager.init();
    SoundManager.preload();

    const interval = setInterval(() => {
      useUserStore.getState().addPlayTime(PLAY_TIME_TICK_MS / 1000);
    }, PLAY_TIME_TICK_MS);

    return () => {
      clearInterval(interval);
      SubscriptionManager.destroy();
      SoundManager.unloadAll();
    };
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
