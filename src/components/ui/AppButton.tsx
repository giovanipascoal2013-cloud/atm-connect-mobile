import React from 'react'
import { Pressable, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon, type AppIconName } from './AppIcon'
import { colors } from '@/theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface AppButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: AppIconName
  iconRight?: AppIconName
  haptic?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand[500], fg: '#FFFFFF' },
  secondary: { bg: colors.brand[50], fg: colors.brand[700] },
  ghost: { bg: 'transparent', fg: colors.brand[500], border: colors.brand[200] },
  danger: { bg: '#FEE2E2', fg: '#DC2626' },
  success: { bg: colors.money, fg: '#FFFFFF' },
  outline: { bg: '#FFFFFF', fg: colors.text.primary, border: colors.border },
}

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number; iconSize: number; radius: number }> = {
  sm: { py: 8, px: 14, fontSize: 13, iconSize: 16, radius: 10 },
  md: { py: 12, px: 18, fontSize: 14, iconSize: 18, radius: 12 },
  lg: { py: 15, px: 22, fontSize: 16, iconSize: 20, radius: 14 },
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  iconRight,
  haptic,
  fullWidth,
  style,
}: AppButtonProps) {
  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]
  const isDisabled = disabled || loading

  const handlePress = () => {
    if (isDisabled || !onPress) return
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    }
    onPress()
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: s.radius,
          borderCurve: 'continuous',
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...(fullWidth ? { width: '100%' } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <>
          {icon && <AppIcon name={icon} size={s.iconSize} color={v.fg} />}
          <Text style={{ fontSize: s.fontSize, fontWeight: '600', color: v.fg }}>{label}</Text>
          {iconRight && <AppIcon name={iconRight} size={s.iconSize} color={v.fg} />}
        </>
      )}
    </Pressable>
  )
}
