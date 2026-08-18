import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { interstitialUnitId } from '../lib/ads'

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

// Cap por sessão (módulo-level): 1 interstitial por arranque da app
let sessionShown = false

export interface UseAdInterstitialResult {
  showInterstitial: () => void
  isLoaded: boolean
}

export function useAdInterstitial(): UseAdInterstitialResult {
  const [isLoaded, setIsLoaded] = useState(false)
  const interstitialRef = useRef<any>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const loadInterstitial = useCallback(() => {
    const AdMob = getAdMob()
    if (!AdMob?.InterstitialAd) return

    const InterstitialAd = AdMob.InterstitialAd
    const AdEventType = AdMob.AdEventType

    try {
      const interstitial = InterstitialAd.createForAdRequest(interstitialUnitId(), {
        requestNonPersonalizedAdsOnly: true,
      })
      interstitialRef.current = interstitial

      unsubRef.current?.()

      const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        setIsLoaded(true)
      })

      const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        unsubRef.current?.()
        interstitialRef.current = null
        setIsLoaded(false)
        setTimeout(() => loadInterstitial(), 1000)
      })

      const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
        setIsLoaded(false)
      })

      unsubRef.current = () => {
        unsubLoaded()
        unsubClosed()
        unsubError()
      }

      interstitial.load()
    } catch {
      setIsLoaded(false)
    }
  }, [])

  const showInterstitial = useCallback(() => {
    if (sessionShown) return
    const interstitial = interstitialRef.current
    if (!interstitial || !isLoaded) return

    sessionShown = true
    setIsLoaded(false)
    try {
      interstitial.show()
    } catch {
      setIsLoaded(false)
    }
  }, [isLoaded])

  useEffect(() => {
    if (!interstitialUnitId()) return
    loadInterstitial()
    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [loadInterstitial])

  return { showInterstitial, isLoaded }
}
