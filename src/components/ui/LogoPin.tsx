import React from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '@/theme/tokens'
import { AppIcon } from './AppIcon'

interface LogoPinProps {
  size?: number
}

export function LogoPin({ size = 56 }: LogoPinProps) {
  const circle = size * 0.68
  const point = size * 0.5

  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: point,
          height: point,
          transform: [{ rotate: '45deg' }],
          borderRadius: point * 0.12,
          backgroundColor: colors.brand[600],
        }}
      />
      <LinearGradient
        colors={[colors.brand[400], colors.brand[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <View
          style={{
            width: circle * 0.66,
            height: circle * 0.66,
            borderRadius: circle * 0.33,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="cash" size={circle * 0.4} color={colors.accent[500]} />
        </View>
      </LinearGradient>
    </View>
  )
}
