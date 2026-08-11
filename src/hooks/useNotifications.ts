import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { Href } from 'expo-router'

let NotificationsModule: any = null
let DeviceModule: any = null

function getNotifications(): any | null {
  if (NotificationsModule) return NotificationsModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NotificationsModule = require('expo-notifications')
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    if (NotificationsModule.setNotificationChannelAsync) {
      NotificationsModule.setNotificationChannelAsync('default', {
        name: 'Atividades',
        importance: NotificationsModule.AndroidImportance?.MAX ?? 4,
      }).catch(() => {})
    }
    return NotificationsModule
  } catch {
    return null
  }
}

function getDevice(): any | null {
  if (DeviceModule) return DeviceModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DeviceModule = require('expo-device')
    return DeviceModule
  } catch {
    return null
  }
}

const TYPE_HREF: Record<string, Href> = {
  atm_approved: '/(tabs)/agent',
  atm_rejected: '/(tabs)/agent',
  subscription_approved: '/(tabs)/profile',
  subscription_rejected: '/(tabs)/profile',
  withdrawal_approved: '/(tabs)/agent',
  withdrawal_rejected: '/(tabs)/agent',
  view_commission: '/(tabs)/agent',
  atm_rating: '/(tabs)/map',
  referral_new: '/referrals',
  forum_reply: '/(tabs)/forum',
}

function routeForNotification(notification: any): Href {
  const type = notification?.request?.content?.data?.type
  return (type && TYPE_HREF[type]) || ('/(tabs)/map' as Href)
}

async function upsertPushToken(userId: string, token: string, platform: string | null) {
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform },
    { onConflict: 'user_id' }
  )
  if (error) {
    // tabela pode não existir ainda no staging — degrada silenciosamente
  }
}

export function useNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const responseListener = useRef<any>(null)

  useEffect(() => {
    if (!user) return

    const Notifications = getNotifications()
    if (!Notifications) return

    const setup = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync()
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync()
          if (newStatus !== 'granted') return
        }

        const Device = getDevice()
        if (Device?.isDevice) {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId
            || Constants.easConfig?.projectId
            || undefined
          const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
          if (token?.data) {
            await upsertPushToken(user.id, token.data, Device.platform ?? null)
          }
        }
      } catch {
        // Push token unavailable in Expo Go / emulator / web — degrade silently
      }

      if (!responseListener.current) {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          router.push(routeForNotification(response))
        })
      }

      // Cold start (app morto + toque na notificação)
      try {
        const last = await Notifications.getLastNotificationResponseAsync()
        if (last) {
          router.push(routeForNotification(last))
        }
      } catch {
        // ignore
      }
    }

    setup()

    return () => {
      const N = getNotifications()
      if (responseListener.current && N) {
        N.removeNotificationSubscription(responseListener.current)
        responseListener.current = null
      }
    }
  }, [user, router])

  return null
}