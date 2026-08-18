import { Platform } from 'react-native'

const TEST = {
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
  },
  interstitial: {
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  },
}

// Env vars lidas estaticamente (regra expo/no-dynamic-env-var)
const BANNER_ANDROID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID
const BANNER_IOS = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
const INTERSTITIAL_ANDROID = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID
const INTERSTITIAL_IOS = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS

export function bannerUnitId(): string | null {
  if (Platform.OS === 'web') return null
  if (Platform.OS === 'ios') return BANNER_IOS || TEST.banner.ios
  return BANNER_ANDROID || TEST.banner.android
}

export function interstitialUnitId(): string | null {
  if (Platform.OS === 'web') return null
  if (Platform.OS === 'ios') return INTERSTITIAL_IOS || TEST.interstitial.ios
  return INTERSTITIAL_ANDROID || TEST.interstitial.android
}
