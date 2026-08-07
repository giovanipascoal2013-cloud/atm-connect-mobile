import { Platform } from 'react-native'
import mobileAds, { TestIds } from 'react-native-google-mobile-ads'

export type AdType = 'banner' | 'interstitial' | 'native'

const ENV_KEYS: Record<AdType, { android: string; ios: string }> = {
  banner: {
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || '',
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || '',
  },
  interstitial: {
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || '',
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || '',
  },
  native: {
    android: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID || '',
    ios: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS || '',
  },
}

const FALLBACKS: Record<AdType, string> = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
  native: TestIds.NATIVE,
}

let initialized = false

export async function initializeAds() {
  if (initialized) return
  initialized = true
  try {
    await mobileAds().initialize()
  } catch (err) {
    console.error('Error initializing AdMob:', err)
  }
}

export function getUnitId(type: AdType): string {
  const key = Platform.OS === 'ios' ? 'ios' : 'android'
  return ENV_KEYS[type][key] || FALLBACKS[type]
}
