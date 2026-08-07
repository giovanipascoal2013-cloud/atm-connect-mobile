import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

export type AppIconName = ComponentProps<typeof Ionicons>['name']

interface AppIconProps extends Omit<ComponentProps<typeof Ionicons>, 'name'> {
  name: AppIconName
}

export function AppIcon({ name, size = 20, color = '#6B7280', ...rest }: AppIconProps) {
  return <Ionicons name={name} size={size} color={color} {...rest} />
}
