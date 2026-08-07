import React from 'react'
import { View, Text } from 'react-native'
import { AppIcon, type AppIconName } from './AppIcon'
import { colors } from '@/theme/tokens'

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'premium'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  icon?: AppIconName
}

const VARIANT: Record<BadgeVariant, { bg: string; fg: string }> = {
  neutral: { bg: '#E9ECEF', fg: '#4B5563' },
  brand: { bg: colors.brand[50], fg: colors.brand[700] },
  success: { bg: colors.accent[50], fg: colors.accent[700] },
  warning: { bg: '#FEF3C7', fg: '#B45309' },
  danger: { bg: '#FEE2E2', fg: '#B91C1C' },
  premium: { bg: '#FEF3C7', fg: '#B45309' },
}

export function Badge({ label, variant = 'neutral', icon }: BadgeProps) {
  const v = VARIANT[variant]
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: v.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      {icon && <AppIcon name={icon} size={13} color={v.fg} />}
      <Text style={{ fontSize: 12, fontWeight: '700', color: v.fg }}>{label}</Text>
    </View>
  )
}
