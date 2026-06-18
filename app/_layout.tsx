import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { FONT_ASSETS, applyGlobalFont } from '../src/theme/fonts';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AdManager } from '../src/ads/AdManager';
import { SoundManager } from '../src/audio/SoundManager';
import { SubscriptionManager } from '../src/iap/SubscriptionManager';
import { GameServicesManager } from '../src/services/GameServicesManager';
import { useUserStore } from '../src/store/userStore';

const PLAY_TIME_TICK_MS = 10000;

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  useEffect(() => {
    if (fontsLoaded) applyGlobalFont();
  }, [fontsLoaded]);

  useEffect(() => {
    AdManager.init();
    SubscriptionManager.init();
    GameServicesManager.init();
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

  // 폰트 로드 전 잠깐 동안은 네이티브 스플래시가 유지되도록 빈 화면을 반환한다.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
