import React from 'react'
import { TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { AppIcon } from '../ui/AppIcon'

interface HeaderBackButtonProps {
  fallback?: string
  color?: string
}

export function HeaderBackButton({ fallback = '/(tabs)/profile', color = '#fff' }: HeaderBackButtonProps) {
  const router = useRouter()

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback as never)
  }

  return (
    <TouchableOpacity
      onPress={goBack}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ marginLeft: 4 }}
    >
      <AppIcon name="chevron-back" size={26} color={color} />
    </TouchableOpacity>
  )
}
