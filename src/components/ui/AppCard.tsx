import React from 'react'
import { View, Pressable, type ViewStyle, type StyleProp, type ViewProps } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

interface AppCardProps extends ViewProps {
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  raised?: boolean
  padded?: boolean
}

export function AppCard({ onPress, raised, padded = true, style, children, ...rest }: AppCardProps) {
  const base = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? 16 : 0,
    ...(raised ? shadows.raised : shadows.card),
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          base,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  )
}
