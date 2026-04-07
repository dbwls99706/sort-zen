import { TestIds } from 'react-native-google-mobile-ads';

const isDev = __DEV__;

export const AD_UNITS = {
  interstitial: isDev
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-6671440092809524/1067286260',
  rewarded: isDev
    ? TestIds.REWARDED
    : 'ca-app-pub-6671440092809524/7441122923',
  banner: isDev
    ? TestIds.BANNER
    : 'ca-app-pub-6671440092809524/9368448114',
};
