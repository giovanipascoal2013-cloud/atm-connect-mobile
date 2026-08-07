import React from 'react'
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native'
import { colors } from '@/theme/tokens'

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean
  padded?: boolean
  contentContainerStyle?: StyleProp<ViewStyle>
}

export function Screen({ scroll = true, padded = true, contentContainerStyle, style, children, ...rest }: ScreenProps) {
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.surface }, style]}>{children}</View>
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.surface }, style]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[padded && { padding: 16 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  )
}
