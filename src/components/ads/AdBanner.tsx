import { Platform } from 'react-native'
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import { useAuth } from '../../hooks/useAuth'
import { bannerUnitId } from '../../lib/ads'

let AdMobModule: any = null

function hasAdMob(): boolean {
  if (Platform.OS === 'web') return false
  if (AdMobModule !== null) return !!AdMobModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AdMobModule = require('react-native-google-mobile-ads')
  } catch {
    AdMobModule = false
  }
  return !!AdMobModule
}

export function AdBanner() {
  const { isPremium } = useAuth()

  const unitId = bannerUnitId()
  if (!unitId || isPremium || !hasAdMob()) return null

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  )
}
