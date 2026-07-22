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
}

export function ATMMapView({ atms, userLocation, selectedATMId, onATMPress }: ATMMapViewProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapboxWebView
        atms={atms}
        userLocation={userLocation}
        selectedATMId={selectedATMId}
        onATMPress={onATMPress}
      />
    </View>
  )
}
