import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { AdManager } from '../src/ads/AdManager';
import { SoundManager } from '../src/audio/SoundManager';

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (consentInfo.isConsentFormAvailable) {
          await AdsConsent.showForm();
        }
        await mobileAds().initialize();
        AdManager.init();
      } catch (e) {
        console.warn('Ads init failed', e);
      }
    })();

    SoundManager.preload();

    return () => {
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
