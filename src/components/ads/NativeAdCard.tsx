import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native'
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
} from 'react-native-google-mobile-ads'
import { getUnitId } from '../../lib/ads'

const MEDIA_WIDTH = Math.min(Dimensions.get('window').width - 60, 400)

export function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null)
  const [failed, setFailed] = useState(false)
  const adRef = useRef<NativeAd | null>(null)

  useEffect(() => {
    let active = true
    const unitId = getUnitId('native')
    if (!unitId) {
      setFailed(true)
      return
    }

    NativeAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
    })
      .then((ad: NativeAd) => {
        if (!active) {
          ad.destroy()
          return
        }
        adRef.current = ad
        setNativeAd(ad)
      })
      .catch((err: Error) => {
        console.warn('Native ad failed to load:', err?.message ?? err)
        if (active) setFailed(true)
      })

    return () => {
      active = false
      adRef.current?.destroy()
      adRef.current = null
    }
  }, [])

  if (failed || !nativeAd) return null

  return (
    <View style={styles.card}>
      <Text style={styles.sponsoredLabel}>Patrocinado</Text>
      <NativeAdView nativeAd={nativeAd} style={styles.adView}>
        <View style={styles.header}>
          {nativeAd.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}
          <View style={styles.headerText}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={1}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>
            {nativeAd.advertiser && (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiser} numberOfLines={1}>
                  {nativeAd.advertiser}
                </Text>
              </NativeAsset>
            )}
          </View>
        </View>

        {nativeAd.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.body} numberOfLines={2}>
              {nativeAd.body}
            </Text>
          </NativeAsset>
        ) : null}

        <NativeMediaView style={styles.media} />

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta} numberOfLines={1}>
              {nativeAd.callToAction}
            </Text>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sponsoredLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  adView: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  advertiser: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  media: {
    width: '100%',
    height: Math.round(MEDIA_WIDTH * 0.5),
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cta: {
    backgroundColor: '#2094F3',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
})
