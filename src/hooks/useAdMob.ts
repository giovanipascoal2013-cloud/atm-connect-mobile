import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

const AD_UNIT_ID = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID || 'ca-app-pub-3940256099942544/5224354917',
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS || 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
})

let AdMobModule: any = null
let adsInitialized: Promise<void> | null = null

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

function initAds(AdMob: any): Promise<void> {
  if (!AdMob?.MobileAds?.initialize) return Promise.resolve()
  if (adsInitialized) return adsInitialized
  const p: Promise<void> = AdMob.MobileAds.initialize()
    .then(() => undefined)
    .catch((e: any) => {
      console.warn('AdMob initialize error:', e)
      adsInitialized = null
    })
  adsInitialized = p
  return p
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
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRewarded = useCallback(() => {
    const AdMob = getAdMob()
    if (!AdMob || !AdMob.RewardedAd) {
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
        retryCountRef.current = 0
        setIsLoaded(true)
        setLoading(false)
      })

      const unsubError = rewarded.addAdEventListener(AdMob.AdEventType.ERROR, (error: any) => {
        console.warn('AdMob Rewarded Load Error:', error)
        setIsLoaded(false)
        setLoading(false)
        // Retry limitado (3 tentativas, 2s de intervalo) para loads falhados
        retryCountRef.current += 1
        if (retryCountRef.current < 3) {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
          retryTimerRef.current = setTimeout(() => {
            loadRewarded()
          }, 2000)
        }
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
    let active = true
    const boot = async () => {
      const AdMob = getAdMob()
      if (!AdMob) return
      await initAds(AdMob)
      if (active) loadRewardedRef.current()
    }
    void boot()
    return () => {
      active = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
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
      let settled = false

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
        AdMob.AdEventType.CLOSED,
        () => settle(rewardEarned)
      )

      const unsubShowError = rewardedRef.current.addAdEventListener(
        AdMob.AdEventType.ERROR,
        () => settle(false)
      )

      const cleanupAndReset = () => {
        unsubEarned()
        unsubClosed()
        unsubShowError()
        retryCountRef.current = 0
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
        setIsLoaded(false)
        rewardedRef.current = null
      }

      const settle = (earned: boolean) => {
        if (settled) return
        settled = true
        cleanupAndReset()
        // Pré-carrega o próximo anúncio em background
        setTimeout(() => {
          loadRewarded()
        }, 1000)
        resolve(earned)
      }

      try {
        rewardedRef.current.show()
      } catch (e) {
        console.warn('AdMob show error:', e)
        settle(false)
      }
    })
  }, [isLoaded, loadRewarded])

  return { loadRewarded, showRewarded, isLoaded, loading }
}