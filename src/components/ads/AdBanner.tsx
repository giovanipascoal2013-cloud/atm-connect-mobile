import React from 'react'
import { View, StyleSheet } from 'react-native'
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import { getUnitId } from '../../lib/ads'

export function AdBanner() {
  const unitId = getUnitId('banner')
  if (!unitId) return null

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error: Error) => {
          console.warn('Banner ad failed to load:', error.message)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
})
