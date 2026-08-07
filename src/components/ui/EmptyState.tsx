import React from 'react'
import { View, Text } from 'react-native'
import { AppButton } from './AppButton'
import { AppIcon, type AppIconName } from './AppIcon'
import { colors } from '@/theme/tokens'

interface EmptyStateProps {
  icon?: AppIconName
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      {icon && (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.brand[50],
            borderWidth: 1,
            borderColor: colors.brand[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <AppIcon name={icon} size={30} color={colors.brand[600]} />
        </View>
      )}
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: 13,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 19,
          }}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: 18 }}>
          <AppButton label={actionLabel} onPress={onAction} icon="add" />
        </View>
      )}
    </View>
  )
}
