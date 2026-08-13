import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

const AD_UNIT_ID = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID || 'ca-app-pub-3940256099942544/5224354917',
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS || 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
})

let AdMobModule: any = null
function getAdMob(): any | null {
  if (Platform.OS === 'web') return null
  if (AdMobModule !== null) return AdMobModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AdMobModule = require('react-native-google-mobile-ads')
    return AdMobModule
  } catch {
    AdMobModule = false
    return null
  }
}

export interface UseAdMobResult {
  loadRewarded: () => void
  showRewarded: () => Promise<boolean>
  isLoaded: boolean
  loading: boolean
}

export function useAdMob(): UseAdMobResult {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const rewardedRef = useRef<any>(null)
  const unsubscribeLoadedRef = useRef<(() => void) | null>(null)

  const loadRewarded = useCallback(() => {
    const AdMob = getAdMob()
    if (!AdMob || !AdMob.RewardedAd || !AdMob.TestIds) {
      return
    }

    if (loading || isLoaded) return
    setLoading(true)

    try {
      const RewardedAd = AdMob.RewardedAd
      const RewardedAdEventType = AdMob.RewardedAdEventType
      const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      })

      rewardedRef.current = rewarded

      unsubscribeLoadedRef.current?.()

      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setIsLoaded(true)
        setLoading(false)
      })

      const unsubError = rewarded.addAdEventListener(RewardedAdEventType.ERROR, (error: any) => {
        console.warn('AdMob Rewarded Load Error:', error)
        setIsLoaded(false)
        setLoading(false)
      })

      unsubscribeLoadedRef.current = () => {
        unsubLoaded()
        unsubError()
      }

      rewarded.load()
    } catch (e) {
      console.warn('AdMob Rewarded error:', e)
      setLoading(false)
      setIsLoaded(false)
    }
  }, [isLoaded, loading])

  const loadRewardedRef = useRef(loadRewarded)

  useEffect(() => {
    loadRewardedRef.current = loadRewarded
  }, [loadRewarded])

  useEffect(() => {
    loadRewardedRef.current()
    return () => {
      unsubscribeLoadedRef.current?.()
    }
  }, [])

  const showRewarded = useCallback(async (): Promise<boolean> => {
    const AdMob = getAdMob()
    if (!AdMob || !rewardedRef.current || !isLoaded) {
      // Degrada amigavelmente se não houver AdMob (ex: web / Expo Go sem dev build)
      return false
    }

    return new Promise<boolean>((resolve) => {
      const RewardedAdEventType = AdMob.RewardedAdEventType
      let rewardEarned = false

      const unsubEarned = rewardedRef.current.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewardEarned = true
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch {}
        }
      )

      const unsubClosed = rewardedRef.current.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          unsubEarned()
          unsubClosed()
          setIsLoaded(false)
          rewardedRef.current = null
          // Pré-carrega o próximo anúncio em background
          setTimeout(() => {
            loadRewarded()
          }, 1000)
          resolve(rewardEarned)
        }
      )

      try {
        rewardedRef.current.show()
      } catch (e) {
        console.warn('AdMob show error:', e)
        unsubEarned()
        unsubClosed()
        setIsLoaded(false)
        rewardedRef.current = null
        resolve(false)
      }
    })
  }, [isLoaded, loadRewarded])

  return { loadRewarded, showRewarded, isLoaded, loading }
}
