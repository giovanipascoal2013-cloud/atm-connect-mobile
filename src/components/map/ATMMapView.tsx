import React from 'react'
import { View, StyleSheet } from 'react-native'
import { MapboxWebView } from './MapboxWebView'
import type { ATMWithDistance } from '../../hooks/useATMs'
import type { LocationState } from '../../hooks/useLocation'

interface ATMMapViewProps {
  atms: ATMWithDistance[]
  userLocation: LocationState
  selectedATMId: string | null
  onATMPress: (atm: ATMWithDistance) => void
  lockedIds?: Set<string>
  isPremium?: boolean
  isLoggedIn?: boolean
}

export function ATMMapView({ atms, userLocation, selectedATMId, onATMPress, lockedIds, isPremium, isLoggedIn }: ATMMapViewProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapboxWebView
        atms={atms}
        userLocation={userLocation}
        selectedATMId={selectedATMId}
        onATMPress={onATMPress}
        lockedIds={lockedIds}
        isPremium={isPremium}
        isLoggedIn={isLoggedIn}
      />
    </View>
  )
}
