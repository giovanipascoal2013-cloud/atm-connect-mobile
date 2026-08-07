import { useCallback, useRef } from 'react'
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads'
import { getUnitId } from '../lib/ads'
import { useAuth } from './useAuth'

const COOLDOWN_MS = 2 * 60 * 1000

export function useInterstitial() {
  const { isPremium } = useAuth()
  const lastShownRef = useRef(0)
  const loadingRef = useRef(false)

  const showInterstitial = useCallback(async () => {
    if (isPremium) return

    const now = Date.now()
    if (now - lastShownRef.current < COOLDOWN_MS) return
    if (loadingRef.current) return
    loadingRef.current = true

    const unitId = getUnitId('interstitial')
    if (!unitId) {
      loadingRef.current = false
      return
    }

    const interstitial = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    })

    let shown = false
    let timedCleanup: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timedCleanup) {
        clearTimeout(timedCleanup)
        timedCleanup = null
      }
      interstitial.removeAllListeners()
      loadingRef.current = false
    }

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      if (shown) return
      shown = true
      try {
        interstitial.show()
      } catch (err) {
        console.error('Error showing interstitial:', err)
        cleanup()
      }
    })

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      lastShownRef.current = Date.now()
      cleanup()
    })

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (err: Error) => {
      console.error('Interstitial error:', err)
      cleanup()
    })

    const cancel = () => {
      unsubscribeLoaded()
      unsubscribeClosed()
      unsubscribeError()
      cleanup()
    }

    timedCleanup = setTimeout(cancel, 15000)

    interstitial.load()
  }, [isPremium])

  return { showInterstitial }
}
