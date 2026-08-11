import React from 'react'
import { View, TouchableOpacity, type ViewStyle, type StyleProp, type TouchableOpacityProps } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

interface AppCardProps extends TouchableOpacityProps {
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  raised?: boolean
  padded?: boolean
}

export function AppCard({ onPress, raised, padded = true, style, children, ...rest }: AppCardProps) {
  const base = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? 16 : 0,
    ...(raised ? shadows.raised : shadows.card),
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[base, style]}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[base, { borderCurve: 'continuous' as const }, style]} {...rest}>
      {children}
    </View>
  )
}
