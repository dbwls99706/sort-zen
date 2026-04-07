import { TestIds } from 'react-native-google-mobile-ads';

const isDev = __DEV__;

export const AD_UNITS = {
  interstitial: isDev
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-XXXXXXXX/YYYYYYYY',
  rewarded: isDev
    ? TestIds.REWARDED
    : 'ca-app-pub-XXXXXXXX/ZZZZZZZZ',
  banner: isDev
    ? TestIds.BANNER
    : 'ca-app-pub-XXXXXXXX/AAAAAAAA',
};
